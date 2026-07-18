// Vault contract interface - handles staking pool operations

import { parseUnits, formatUnits, createPublicClient, createWalletClient, http } from "viem";
import { bsc } from "viem/chains";

/**
 * Vault Contract ABI (simplified for demo)
 * In production, this would be your deployed vault contract ABI
 */
const VAULT_ABI = [
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

/**
 * USDC Token ABI (for approvals)
 */
const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// Contract addresses (replace with your deployed contracts)
const VAULT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";
const USDC_ADDRESS = process.env.USDC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";

/**
 * Get vault statistics
 * @param {string} userAddress - Optional user address to include their position
 * @returns {Promise<Object>} Vault stats
 */
export async function getVaultStats(userAddress = null) {
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(process.env.RPC_URL || "https://bsc-dataseed.binance.org"),
  });

  try {
    // Read vault contract
    const [totalAssets, totalSupply] = await Promise.all([
      publicClient.readContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "totalAssets",
      }),
      publicClient.readContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "totalSupply",
      }),
    ]);

    let userBalance = "0";
    let userShares = "0";

    if (userAddress) {
      userShares = await publicClient.readContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "balanceOf",
        args: [userAddress],
      });

      // Calculate user's share of total assets
      if (totalSupply > 0n) {
        userBalance = (BigInt(userShares) * BigInt(totalAssets)) / BigInt(totalSupply);
      }
    }

    return {
      totalAssets: formatUnits(totalAssets, 18),
      totalSupply: formatUnits(totalSupply, 18),
      userShares: userAddress ? formatUnits(userShares, 18) : "0",
      userBalance: userAddress ? formatUnits(userBalance, 18) : "0",
      sharePrice: totalSupply > 0n ? formatUnits((BigInt(totalAssets) * parseUnits("1", 18)) / BigInt(totalSupply), 18) : "1.0",
    };
  } catch (err) {
    // If contracts not deployed yet, return mock data
    console.warn("Vault contract not available, returning mock data");
    return {
      totalAssets: "10000.0",
      totalSupply: "10000.0",
      userShares: "0",
      userBalance: "0",
      sharePrice: "1.0",
      isMock: true,
    };
  }
}

/**
 * Build deposit transaction data
 * @param {string} amount - Amount in USDC (human readable, e.g. "100")
 * @returns {Object} Transaction data for frontend to send
 */
export function buildDepositTx(amount) {
  const amountWei = parseUnits(amount, 18);

  return {
    // Step 1: Approve USDC spending
    approvalTx: {
      to: USDC_ADDRESS,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: "approve",
        args: [VAULT_ADDRESS, amountWei],
      }),
      value: "0x0",
    },
    // Step 2: Deposit to vault
    depositTx: {
      to: VAULT_ADDRESS,
      data: encodeFunctionData({
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [amountWei],
      }),
      value: "0x0",
    },
    amount: amount,
    amountWei: amountWei.toString(),
  };
}

/**
 * Build withdrawal transaction data
 * @param {string} shares - Number of shares to redeem (human readable)
 * @returns {Object} Transaction data for frontend to send
 */
export function buildWithdrawTx(shares) {
  const sharesWei = parseUnits(shares, 18);

  return {
    to: VAULT_ADDRESS,
    data: encodeFunctionData({
      abi: VAULT_ABI,
      functionName: "withdraw",
      args: [sharesWei],
    }),
    value: "0x0",
    shares: shares,
    sharesWei: sharesWei.toString(),
  };
}

/**
 * Helper to encode function data (for building txs)
 */
function encodeFunctionData({ abi, functionName, args }) {
  // This is a simplified version - in production use viem's encodeFunctionData
  // For now, return a placeholder that frontend will handle
  return "0x"; // Frontend will use wagmi to encode properly
}

/**
 * Simulate vault strategy returns (for demo)
 * This would be replaced with actual on-chain data in production
 */
export function getVaultPerformance() {
  return {
    apy: "67.0", // Estimated APY
    tvl: "10000.0", // Total Value Locked
    weeklyReturn: "1.2", // Weekly return %
    monthlyReturn: "5.4", // Monthly return %
    totalPositions: 45, // Total positions executed
    activePositions: 12, // Currently active
    winRate: "94.1", // Win rate %
    strategyBreakdown: {
      convergence: {
        allocation: 60,
        apy: "58.0",
        positions: 28,
      },
      arbitrage: {
        allocation: 40,
        apy: "82.0",
        positions: 17,
      },
    },
  };
}

/**
 * Get user's staking position
 * @param {string} address - User wallet address
 * @returns {Promise<Object>} User position data
 */
export async function getUserPosition(address) {
  const stats = await getVaultStats(address);
  const performance = getVaultPerformance();

  // Calculate user's share of performance
  const userShareOfPool = stats.totalSupply > 0 
    ? (parseFloat(stats.userShares) / parseFloat(stats.totalSupply)) * 100
    : 0;

  return {
    deposited: stats.userBalance,
    shares: stats.userShares,
    currentValue: stats.userBalance, // In production, calculate with PnL
    shareOfPool: userShareOfPool.toFixed(4),
    estimatedApy: performance.apy,
    strategyAllocation: performance.strategyBreakdown,
  };
}
