import { describe, it, expect } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  assertNetworkAllowed,
  createRamp,
  isNairaRampError,
  keypairSigner,
  type AnchorEntry,
} from "../src/index.js";

describe("Mainnet safety guard (src/guard.ts)", () => {
  const FIXED_DATE = new Date("2026-10-01T00:00:00.000Z");
  const now = () => FIXED_DATE;

  const baseMainnetAnchor: AnchorEntry = {
    id: "test-mainnet-anchor",
    name: "Test Mainnet Anchor",
    homeDomain: "mainnet.example.com",
    network: "mainnet",
    assets: [
      {
        code: "USDC",
        issuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      },
    ],
    seps: ["sep10", "sep24"],
    countries: ["NG"],
    verifiedAt: "2026-09-01",
  };

  const baseTestnetAnchor: AnchorEntry = {
    id: "test-testnet-anchor",
    name: "Test Testnet Anchor",
    homeDomain: "testnet.example.com",
    network: "testnet",
    assets: [
      {
        code: "SRT",
        issuer: "GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
      },
    ],
    seps: ["sep10", "sep24"],
    countries: [],
    verifiedAt: "2025-01-01", // Old date on purpose to prove testnet unaffected
  };

  describe("Branch 1: network 'mainnet' and allowMainnet !== true", () => {
    it("throws MAINNET_NOT_ALLOWED when allowMainnet is undefined", () => {
      let caught: unknown;
      try {
        assertNetworkAllowed({
          network: "mainnet",
          anchor: baseMainnetAnchor,
          now,
        });
      } catch (err) {
        caught = err;
      }

      expect(isNairaRampError(caught)).toBe(true);
      expect((caught as { code: string }).code).toBe("MAINNET_NOT_ALLOWED");
      expect((caught as Error).message).toContain("Mainnet operations are not allowed");
    });

    it("throws MAINNET_NOT_ALLOWED when allowMainnet is explicitly false", () => {
      let caught: unknown;
      try {
        assertNetworkAllowed({
          network: "mainnet",
          anchor: baseMainnetAnchor,
          allowMainnet: false,
          now,
        });
      } catch (err) {
        caught = err;
      }

      expect(isNairaRampError(caught)).toBe(true);
      expect((caught as { code: string }).code).toBe("MAINNET_NOT_ALLOWED");
    });
  });

  describe("Branch 2: anchor.network !== network", () => {
    it("throws ANCHOR_NOT_FOUND explaining mismatch when requesting mainnet with a testnet anchor", () => {
      let caught: unknown;
      try {
        assertNetworkAllowed({
          network: "mainnet",
          anchor: baseTestnetAnchor,
          allowMainnet: true,
          now,
        });
      } catch (err) {
        caught = err;
      }

      expect(isNairaRampError(caught)).toBe(true);
      expect((caught as { code: string }).code).toBe("ANCHOR_NOT_FOUND");
      const msg = (caught as Error).message;
      expect(msg).toContain("test-testnet-anchor");
      expect(msg).toContain("testnet");
      expect(msg).toContain("mainnet");
    });

    it("throws ANCHOR_NOT_FOUND explaining mismatch when requesting testnet with a mainnet anchor", () => {
      let caught: unknown;
      try {
        assertNetworkAllowed({
          network: "testnet",
          anchor: baseMainnetAnchor,
          now,
        });
      } catch (err) {
        caught = err;
      }

      expect(isNairaRampError(caught)).toBe(true);
      expect((caught as { code: string }).code).toBe("ANCHOR_NOT_FOUND");
      const msg = (caught as Error).message;
      expect(msg).toContain("test-mainnet-anchor");
      expect(msg).toContain("mainnet");
      expect(msg).toContain("testnet");
    });
  });

  describe("Branch 3: network 'mainnet' verifiedAt 90-day boundary", () => {
    it("throws ANCHOR_NOT_VERIFIED naming anchor and verifiedAt when older than 90 days (91 days: 2026-07-02)", () => {
      const anchor: AnchorEntry = {
        ...baseMainnetAnchor,
        id: "stale-anchor",
        verifiedAt: "2026-07-02",
      };

      let caught: unknown;
      try {
        assertNetworkAllowed({
          network: "mainnet",
          anchor,
          allowMainnet: true,
          now,
        });
      } catch (err) {
        caught = err;
      }

      expect(isNairaRampError(caught)).toBe(true);
      expect((caught as { code: string }).code).toBe("ANCHOR_NOT_VERIFIED");
      const msg = (caught as Error).message;
      expect(msg).toContain("stale-anchor");
      expect(msg).toContain("2026-07-02");
    });

    it("allows verification at the exact 90-day boundary (2026-07-03)", () => {
      const anchor: AnchorEntry = {
        ...baseMainnetAnchor,
        id: "boundary-anchor",
        verifiedAt: "2026-07-03",
      };

      expect(() => {
        assertNetworkAllowed({
          network: "mainnet",
          anchor,
          allowMainnet: true,
          now,
        });
      }).not.toThrow();
    });

    it("allows verification within 90 days (89 days: 2026-07-04)", () => {
      const anchor: AnchorEntry = {
        ...baseMainnetAnchor,
        id: "fresh-anchor",
        verifiedAt: "2026-07-04",
      };

      expect(() => {
        assertNetworkAllowed({
          network: "mainnet",
          anchor,
          allowMainnet: true,
          now,
        });
      }).not.toThrow();
    });

    it("throws ANCHOR_NOT_VERIFIED on invalid verifiedAt date string", () => {
      const anchor: AnchorEntry = {
        ...baseMainnetAnchor,
        id: "invalid-date-anchor",
        verifiedAt: "not-a-date",
      };

      let caught: unknown;
      try {
        assertNetworkAllowed({
          network: "mainnet",
          anchor,
          allowMainnet: true,
          now,
        });
      } catch (err) {
        caught = err;
      }

      expect(isNairaRampError(caught)).toBe(true);
      expect((caught as { code: string }).code).toBe("ANCHOR_NOT_VERIFIED");
      expect((caught as Error).message).toContain("invalid-date-anchor");
      expect((caught as Error).message).toContain("not-a-date");
    });
  });

  describe("Branch 4: testnet is otherwise unaffected", () => {
    it("allows testnet even if verifiedAt is older than 90 days and allowMainnet is false", () => {
      expect(() => {
        assertNetworkAllowed({
          network: "testnet",
          anchor: baseTestnetAnchor,
          allowMainnet: false,
          now,
        });
      }).not.toThrow();
    });

    it("allows testnet without allowMainnet or now options", () => {
      expect(() => {
        assertNetworkAllowed({
          network: "testnet",
          anchor: baseTestnetAnchor,
        });
      }).not.toThrow();
    });
  });

  describe("createRamp integration", () => {
    const signer = keypairSigner(Keypair.random().secret());

    it("throws MAINNET_NOT_ALLOWED when createRamp called with network 'mainnet' without allowMainnet", () => {
      expect(() => {
        createRamp({
          network: "mainnet",
          anchorId: "sdf-testanchor",
          signer,
        });
      }).toThrowError(
        expect.objectContaining({
          code: "MAINNET_NOT_ALLOWED",
        })
      );
    });

    it("throws ANCHOR_NOT_FOUND when createRamp called with mainnet and testnet anchor even with allowMainnet", () => {
      expect(() => {
        createRamp({
          network: "mainnet",
          anchorId: "sdf-testanchor",
          signer,
          allowMainnet: true,
          now,
        });
      }).toThrowError(
        expect.objectContaining({
          code: "ANCHOR_NOT_FOUND",
        })
      );
    });

    it("succeeds creating testnet ramp without allowMainnet", () => {
      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer,
      });
      expect(ramp).toBeDefined();
      expect(typeof ramp.authenticate).toBe("function");
    });
  });
});

