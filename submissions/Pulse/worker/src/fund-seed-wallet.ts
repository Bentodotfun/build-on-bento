import "dotenv/config";
import { getSeedManagedAddress } from "./bento.js";

const BENTO_URL = process.env.BENTO_URL!;
const BUILDER_API_KEY = process.env.BENTO_BUILDER_API_KEY!;

async function main() {
  const managedAddress = await getSeedManagedAddress();
  console.log("Seed wallet managed address:", managedAddress);
  const res = await fetch(`${BENTO_URL}/bento/auto-mint/mint`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-builder-api-key": BUILDER_API_KEY },
    body: JSON.stringify({ userAddress: managedAddress }),
  });
  console.log(await res.json());
}
main();
