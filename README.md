# Build on Bento - Hackathon Submission

Submit your build by adding a **team folder** under `submissions/` and opening a pull request.

**Your PR will not be accepted until you also submit the official form:**  
[Build on Bento - BLR Edition form](https://forms.gle/UiJB7fVNCpwvnVLa7)

---

## How to submit (participants)

1. **Submit the form:** [forms.gle/UiJB7fVNCpwvnVLa7](https://forms.gle/UiJB7fVNCpwvnVLa7) (required - PR alone is not enough).
2. **Fork** this repo: [Bentodotfun/build-on-bento](https://github.com/Bentodotfun/build-on-bento)
3. Copy the template folder:

```bash
cp -R submissions/_TEMPLATE submissions/YourTeamName
```

Use a short folder name (letters, numbers, hyphens). Example: `submissions/Alpha`, `submissions/market-bot`.

4. Fill in `submissions/YourTeamName/README.md` (project, links, Bento integration, how to run).
5. Optional: put demo screenshots in `submissions/YourTeamName/assets/`, or add your project code in that folder.
6. Open a **Pull Request** into `Bentodotfun/build-on-bento` → `main`.
7. PR title: `[TeamName] ProjectName` (example: `[Alpha] MarketBot`).

**Do not edit the root README** or other teams' folders. Only add/change files under `submissions/YourTeamName/`.

### Layout

```text
submissions/
  _TEMPLATE/          <- copy this (do not edit in place)
    README.md
  YourTeamName/       <- your submission
    README.md
    assets/           <- optional screenshots
    (your code)       <- optional
```

---

## Submission checklist

Before you open the PR:

- [ ] Submitted the [BLR Edition form](https://forms.gle/UiJB7fVNCpwvnVLa7) - **PR will not be accepted without this**
- [ ] Created `submissions/YourTeamName/` from `_TEMPLATE`
- [ ] Filled in `submissions/YourTeamName/README.md`
- [ ] PR title is `[TeamName] ProjectName`
- [ ] Live demo **or** clear local run instructions
- [ ] Demo video (≤2 min) **or** slide deck
- [ ] Bento integration table completed (Yes/No + describe)
- [ ] No secrets committed (`.env` gitignored)

---

## Env vars (for your project)

| Env var | SDK option | Required | Description |
|---------|------------|----------|-------------|
| `BENTO_BUILDER_API_KEY` | `apiKey` | yes | Testnet builder key (`x-builder-api-key`) |
| `BENTO_URL` | `baseUrl` | yes | Markets host |
| `PARLAY_TOURNMENT_URL` | `tournamentsBaseUrl` | if using parlays / tournaments / F1 | Tournaments host (spelling: `TOURNMENT`) |

```bash
export BENTO_BUILDER_API_KEY='bnt_…'   # from docs form
export BENTO_URL='https://internal-server.bento.fun'
export PARLAY_TOURNMENT_URL='https://bento-fun-tournaments-backend-3nku.onrender.com'  # optional
```

```ts
import { createBentoSdk, walletAuthProvider } from '@bento.fun/sdk';

const sdk = createBentoSdk({
  baseUrl: process.env.BENTO_URL!,
  apiKey: process.env.BENTO_BUILDER_API_KEY!,
  tournamentsBaseUrl: process.env.PARLAY_TOURNMENT_URL, // optional
  auth: walletAuthProvider(() => ({ Authorization: `Bearer ${userJwt}` })),
});
```

---

## Resources

| Resource | Link |
|----------|------|
| App | Mainnet: [app.bento.fun](https://app.bento.fun) · Testnet: [testnet.bento.fun](https://testnet.bento.fun) |
| Docs | [docs.bento.fun](https://docs.bento.fun) |
| Quickstart | [docs.bento.fun/quickstart](https://docs.bento.fun/quickstart) |
| Builder API key (testnet) | [docs.bento.fun/concepts/builder-api-key](https://docs.bento.fun/concepts/builder-api-key) |
| SDK (npm) | [`@bento.fun/sdk`](https://www.npmjs.com/package/@bento.fun/sdk) |

```bash
npm install @bento.fun/sdk
```

---

## License

Unless you specify otherwise in your folder, keep your submission code under a license of your choice. This template repo is provided by Bento for hackathon submissions only.
