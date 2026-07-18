import { jest } from '@jest/globals';

/**
 * To avoid "Cannot find module @bento.fun/sdk" errors during test runs
 * (the package may not exist in node_modules), we mock it before any
 * imports happen. The mock must include walletAuthProvider since
 * bento-auth.js imports it.
 */

const mockCreateDuel = jest.fn().mockResolvedValue({
  kind: 'accepted',
  raw: {
    duelId: 'test-duel-id',
    txHash: '0xmocktxhash',
  },
  duelId: 'test-duel-id',
  txHash: '0xmocktxhash',
});

export const mockBentoSdk = {
  public: {
    listDuels: jest.fn().mockResolvedValue({ duels: [] }),
    getDuelById: jest.fn().mockResolvedValue({
      duelId: 'test-duel-id',
      status: 'open',
      winningOptionIndex: null,
      options: [
        { probability: 60 },
        { probability: 40 },
      ],
    }),
    auth: {
      eoaLogin: jest.fn().mockResolvedValue({ token: 'mock-jwt-token' }),
      eoaRegister: jest.fn().mockResolvedValue({ token: 'mock-jwt-token' }),
    },
    autoMint: {
      mint: jest.fn().mockResolvedValue({}),
    },
  },
  user: {
    createDuel: mockCreateDuel,
    bets: {
      estimateBuy: jest.fn().mockResolvedValue({
        success: true,
        estimate: {
          shares_out: '1000000000000000000',
          min_shares_out: '950000000000000000',
          quote_id: 'mock-quote-id',
        },
      }),
    },
    placeBet: jest.fn().mockResolvedValue({
      txHash: '0xmockbettxhash',
    }),
    duels: {
      resolve: jest.fn().mockResolvedValue({
        txHash: '0xmockresolvetxhash',
      }),
    },
  },
};

export const mockAnakinClient = {
  post: jest.fn().mockImplementation((endpoint) => {
    if (endpoint === '/search') {
      return Promise.resolve({
        data: {
          summary: 'Mock research summary about the claim.',
          results: [
            { url: 'https://example.com/source1' },
            { url: 'https://example.com/source2' },
          ],
        },
      });
    }
    if (endpoint === '/agentic-search') {
      return Promise.resolve({ data: { job_id: 'mock-job-id' } });
    }
    return Promise.resolve({ data: {} });
  }),
  get: jest.fn().mockImplementation((endpoint) => {
    if (endpoint.includes('agentic-search')) {
      return Promise.resolve({
        data: {
          status: 'completed',
          generatedJson: {
            summary: 'Mock deep research summary',
            structured_data: { key: 'value' },
          },
        },
      });
    }
    return Promise.resolve({ data: {} });
  }),
};

/**
 * Mock OpenRouter axios.post response for AI module calls.
 */
function mockOpenRouterResponse(prompt) {
  let text = 'Mock AI response';

  if (prompt.includes('Extract the core factual claim from this tweet')) {
    text = 'Apple is acquiring Perplexity AI for $5 billion';
  } else if (prompt.includes('creating a prediction market on Bento')) {
    text = JSON.stringify({
      question: 'Does Apple acquire Perplexity AI before 2026-08-17?',
      claim: 'Apple is acquiring Perplexity AI for $5 billion'
    });
  } else if (prompt.includes('12-word-max hook line')) {
    text = 'No official statement yet, sources report early-stage talks';
  } else if (prompt.includes('assess whether this claim')) {
    text = JSON.stringify({
      verdict: 'true',
      confidence: 75,
      reasoning: 'Multiple sources support the claim',
    });
  }

  return {
    data: {
      choices: [
        {
          message: {
            content: text,
          },
        },
      ],
    },
  };
}

export const setupMocks = () => {
  jest.unstable_mockModule('@bento.fun/sdk', () => ({
    createBentoSdk: jest.fn().mockReturnValue(mockBentoSdk),
    walletAuthProvider: jest.fn().mockImplementation((fn) => ({ getAuthHeaders: fn })),
  }));

  jest.unstable_mockModule('axios', () => ({
    default: {
      create: jest.fn().mockReturnValue(mockAnakinClient),
      post: jest.fn().mockImplementation((url, data) => {
        if (typeof url === 'string' && url.includes('openrouter')) {
          const prompt = data?.messages?.[0]?.content || '';
          return Promise.resolve(mockOpenRouterResponse(prompt));
        }
        if (typeof url === 'string' && url.includes('anakin')) {
          return mockAnakinClient.post(url);
        }
        return mockAnakinClient.post(url);
      }),
      get: mockAnakinClient.get,
    },
    create: jest.fn().mockReturnValue(mockAnakinClient),
  }));

  jest.unstable_mockModule('viem/accounts', () => ({
    generatePrivateKey: jest
      .fn()
      .mockImplementation(
        () => '0x' + Math.random().toString(16).slice(2).padEnd(64, 'a'),
      ),
    privateKeyToAccount: jest.fn().mockImplementation(() => ({
      address: '0x' + Math.random().toString(16).slice(2).padEnd(40, 'b'),
      signMessage: jest.fn().mockResolvedValue('0x' + 'c'.repeat(130)),
    })),
  }));

  jest.unstable_mockModule('viem', () => ({
    parseUnits: jest.fn().mockImplementation((val, decimals) => ({
      toString: () => BigInt(val) * BigInt(10) ** BigInt(decimals),
    })),
  }));
};
