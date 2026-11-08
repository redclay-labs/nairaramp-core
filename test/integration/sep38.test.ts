import { describe, it, expect } from "vitest";
import { Wallet } from "@stellar/typescript-wallet-sdk";
import { createRamp, getAnchor, keypairSigner } from "../../src/index.js";
import { createFundedTestAccount } from "./helpers.js";

const shouldRun = process.env.RUN_INTEGRATION === "1";

describe.skipIf(!shouldRun)("SEP-38 integration test", () => {
  it("reads SEP-38 info first and asks a price only for a listed pair", async () => {
    const anchorEntry = getAnchor("sdf-testanchor");
    expect(anchorEntry.seps).toContain("sep38");

    // 1. Read SEP-38 /info from the anchor
    const wallet = Wallet.TestNet();
    const anchorClient = wallet.anchor({ homeDomain: anchorEntry.homeDomain });
    const sep38Info = await anchorClient.sep38().info();

    expect(sep38Info).toBeDefined();
    expect(Array.isArray(sep38Info.assets)).toBe(true);
    expect(sep38Info.assets.length).toBeGreaterThan(0);

    // 2. Select a pair listed in /info (e.g. stellar:SRT:... and iso4217:USD)
    const stellarAsset = sep38Info.assets.find((a) =>
      a.asset.startsWith("stellar:SRT:")
    );
    const fiatAsset = sep38Info.assets.find((a) =>
      a.asset.startsWith("iso4217:USD")
    );

    expect(stellarAsset).toBeDefined();
    expect(fiatAsset).toBeDefined();

    const sellAsset = stellarAsset!.asset;
    const buyAsset = fiatAsset!.asset;

    // 3. Fund test account for keypair signer
    const secret = await createFundedTestAccount();
    const ramp = createRamp({
      network: "testnet",
      anchorId: "sdf-testanchor",
      signer: keypairSigner(secret),
    });

    // 4. Request price quote for the listed pair
    const quote = await ramp.getPrice({
      sellAsset,
      buyAsset,
      sellAmount: "5",
    });

    expect(quote).toBeDefined();
    expect(quote.sellAsset).toBe(sellAsset);
    expect(quote.buyAsset).toBe(buyAsset);
    expect(typeof quote.price).toBe("string");
    expect(typeof quote.sellAmount).toBe("string");
    expect(typeof quote.buyAmount).toBe("string");
    expect(typeof quote.totalFee).toBe("string");
    expect(typeof quote.feeAsset).toBe("string");

    expect(Number(quote.price)).toBeGreaterThan(0);
    expect(Number(quote.buyAmount)).toBeGreaterThan(0);
  });
});

