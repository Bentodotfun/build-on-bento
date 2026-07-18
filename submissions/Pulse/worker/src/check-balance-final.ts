import "dotenv/config";
import { getAuthedSdk } from "./bento.js";

async function main() {
  const sdk = await getAuthedSdk();
  const managedAddress = "0x377d175bca685d8d7e8e629ab373de88a310747b";
  try {
    const details: any = await sdk.user.portfolio.getAccountDetails({ userAddress: managedAddress });
    console.log("getAccountDetails:", JSON.stringify(details, null, 2));
  } catch (e: any) {
    console.log("failed:", e?.sdkError ?? e?.message);
  }
  try {
    const positions: any = await sdk.user.portfolio.getPositions(managedAddress);
    console.log("getPositions:", JSON.stringify(positions, null, 2));
  } catch (e: any) {
    console.log("positions failed:", e?.sdkError ?? e?.message);
  }
}
main();
