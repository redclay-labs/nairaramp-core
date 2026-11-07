import { describe, it, expect } from "vitest";
import { createRamp, getAnchor, keypairSigner } from "../../src/index.js";
import { addTrustline, createFundedTestAccount } from "./helpers.js";

describe.skipIf(process.env.RUN_INTEGRATION !== "1")(
  "SEP-24 live integration",
  () => {
    it(
      "funds account, adds trustline for sdf-testanchor asset, deposits, and gets incomplete transaction",
      async () => {
        const secret = await createFundedTestAccount();
        const anchor = getAnchor("sdf-testanchor");
        const srtAsset = anchor.assets.find((a) => a.code === "SRT");
        if (!srtAsset) {
          throw new Error("SRT asset not found in sdf-testanchor");
        }

        await addTrustline(secret, srtAsset.code, srtAsset.issuer);

        const ramp = createRamp({
          network: "testnet",
          anchorId: "sdf-testanchor",
          signer: keypairSigner(secret),
        });

        const depositRes = await ramp.deposit({
          assetCode: "SRT",
          amount: "10",
        });

        expect(typeof depositRes.id).toBe("string");
        expect(depositRes.id.length).toBeGreaterThan(0);
        expect(depositRes.url.startsWith("https://")).toBe(true);

        const tx = await ramp.getTransaction(depositRes.id);
        expect(tx.id).toBe(depositRes.id);
        expect(tx.status).toBe("incomplete");
      },
      60000
    );
  }
);

