import "dotenv/config";
import { getAuthedSdk } from "./bento.js";

async function main() {
  const sdk = await getAuthedSdk();
  const now = Date.now();
  try {
    const created = await sdk.user.createDuel({
      question: "[pulse-generator-check] status probe",
      type: "prediction",
      category: "Football",
      optionA: "Yes",
      optionB: "No",
      startTime: new Date(now + 10 * 60_000).toISOString(),
      endTime: new Date(now + 15 * 60_000).toISOString(),
      privacyAccess: "private",
      collateralMode: "credits",
    });
    console.log("UNBLOCKED — SUCCESS:", (created as any).raw?.duelId);
  } catch (e: any) {
    console.log("STILL BLOCKED:", e?.sdkError?.message ?? e?.message);
  }
}

main();
