import { describe, it, expect } from "vitest";
import { createRamp, keypairSigner } from "../../src/index.js";
import { createFundedTestAccount } from "./helpers.js";

describe.skipIf(process.env.RUN_INTEGRATION !== "1")(
  "SEP-10 live integration",
  () => {
    it("funds account, authenticates with sdf-testanchor, and returns 3-part JWT", async () => {
      const secret = await createFundedTestAccount();
      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: keypairSigner(secret),
      });

      const token = await ramp.authenticate();
      expect(typeof token).toBe("string");

      const parts = token.split(".");
      expect(parts.length).toBe(3);
      expect(parts[0]?.length).toBeGreaterThan(0);
      expect(parts[1]?.length).toBeGreaterThan(0);
      expect(parts[2]?.length).toBeGreaterThan(0);
    });
  }
);

