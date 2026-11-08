import { describe, it, expect, vi, beforeEach } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  createRamp,
  isNairaRampError,
  type Signer,
} from "../src/index.js";
import { fetchPrice, type QuoteClientContext } from "../src/quotes.js";

const {
  mockSep10Authenticate,
  mockSep38Price,
  mockSep38,
  mockTestNet,
  mockMainNet,
} = vi.hoisted(() => {
  const mockSep10Authenticate = vi.fn();
  const mockSep10 = vi.fn().mockResolvedValue({
    authenticate: mockSep10Authenticate,
  });
  const mockSep38Price = vi.fn();
  const mockSep38 = vi.fn().mockReturnValue({
    price: mockSep38Price,
  });
  const mockAnchor = vi.fn().mockReturnValue({
    sep10: mockSep10,
    sep38: mockSep38,
  });
  const mockTestNet = vi.fn().mockReturnValue({
    anchor: mockAnchor,
  });
  const mockMainNet = vi.fn().mockReturnValue({
    anchor: mockAnchor,
  });

  return {
    mockSep10Authenticate,
    mockSep10,
    mockSep38Price,
    mockSep38,
    mockAnchor,
    mockTestNet,
    mockMainNet,
  };
});

vi.mock("@stellar/typescript-wallet-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/typescript-wallet-sdk")>();
  return {
    ...actual,
    Wallet: {
      ...actual.Wallet,
      TestNet: mockTestNet,
      MainNet: mockMainNet,
    },
  };
});

describe("SEP-38 quotes (ramp.getPrice & quotes.ts)", () => {
  const mockSigner: Signer = {
    getPublicKey: vi.fn().mockResolvedValue(Keypair.random().publicKey()),
    signTransaction: vi.fn().mockImplementation((xdr: string) => Promise.resolve(xdr)),
  };

  const validJwt =
    "header." +
    Buffer.from(
      JSON.stringify({
        sub: Keypair.random().publicKey(),
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString("base64") +
    ".signature";

  beforeEach(() => {
    vi.clearAllMocks();
    mockSep10Authenticate.mockResolvedValue({ token: validJwt });
    mockSep38Price.mockResolvedValue({
      price: "6.9001207521",
      total_price: "8.6251509401",
      sell_amount: "5",
      buy_amount: "0.5797",
      fee: {
        total: "1.00",
        asset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
      },
    });
  });

  describe("QUOTE_UNAVAILABLE without network call", () => {
    it("throws QUOTE_UNAVAILABLE when neither sellAmount nor buyAmount is given", async () => {
      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      let caught: unknown;
      try {
        await ramp.getPrice({
          sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
          buyAsset: "iso4217:USD",
        });
      } catch (err) {
        caught = err;
      }

      expect(isNairaRampError(caught)).toBe(true);
      expect((caught as { code: string }).code).toBe("QUOTE_UNAVAILABLE");
      expect((caught as Error).message).toContain("Exactly one of sellAmount or buyAmount");
      expect(mockSep10Authenticate).not.toHaveBeenCalled();
      expect(mockSep38Price).not.toHaveBeenCalled();
    });

    it("throws QUOTE_UNAVAILABLE when both sellAmount and buyAmount are given", async () => {
      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      let caught: unknown;
      try {
        await ramp.getPrice({
          sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
          buyAsset: "iso4217:USD",
          sellAmount: "5",
          buyAmount: "10",
        });
      } catch (err) {
        caught = err;
      }

      expect(isNairaRampError(caught)).toBe(true);
      expect((caught as { code: string }).code).toBe("QUOTE_UNAVAILABLE");
      expect((caught as Error).message).toContain("Exactly one of sellAmount or buyAmount");
      expect(mockSep10Authenticate).not.toHaveBeenCalled();
      expect(mockSep38Price).not.toHaveBeenCalled();
    });

    it("throws QUOTE_UNAVAILABLE naming the anchor when anchor registry seps lacks sep38", async () => {
      const noSep38Context: QuoteClientContext = {
        anchor: {
          id: "no-sep38-anchor",
          name: "No SEP38 Anchor",
          homeDomain: "example.com",
          network: "testnet",
          assets: [],
          seps: ["sep6", "sep24"],
          countries: [],
          verifiedAt: "2026-11-08",
        },
        anchorClient: {
          sep38: mockSep38,
        },
        authenticate: vi.fn(),
      };

      let caught: unknown;
      try {
        await fetchPrice(
          {
            sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
            buyAsset: "iso4217:USD",
            sellAmount: "5",
          },
          noSep38Context
        );
      } catch (err) {
        caught = err;
      }

      expect(isNairaRampError(caught)).toBe(true);
      expect((caught as { code: string }).code).toBe("QUOTE_UNAVAILABLE");
      expect((caught as Error).message).toContain("no-sep38-anchor");
      expect(noSep38Context.authenticate).not.toHaveBeenCalled();
      expect(mockSep38Price).not.toHaveBeenCalled();
    });
  });

  describe("Normalization", () => {
    it("normalizes response into Quote with strings and trims asset strings", async () => {
      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const quote = await ramp.getPrice({
        sellAsset: "  stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B  ",
        buyAsset: "  iso4217:USD  ",
        sellAmount: "5",
      });

      expect(quote).toEqual({
        sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
        buyAsset: "iso4217:USD",
        sellAmount: "5",
        buyAmount: "0.5797",
        price: "6.9001207521",
        totalFee: "1.00",
        feeAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
      });

      expect(mockSep38Price).toHaveBeenCalledWith({
        sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
        buyAsset: "iso4217:USD",
        sellAmount: "5",
        context: "sep6",
      });
    });

    it("normalizes float/numeric response values to strings and never returns floats", async () => {
      mockSep38Price.mockResolvedValue({
        price: 1.25,
        total_price: 1.35,
        sell_amount: 10,
        buy_amount: 8,
        fee: {
          total: 0.5,
          asset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
        },
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const quote = await ramp.getPrice({
        sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
        buyAsset: "iso4217:USD",
        buyAmount: "8",
      });

      expect(typeof quote.price).toBe("string");
      expect(typeof quote.sellAmount).toBe("string");
      expect(typeof quote.buyAmount).toBe("string");
      expect(typeof quote.totalFee).toBe("string");
      expect(quote.price).toBe("1.25");
      expect(quote.sellAmount).toBe("10");
      expect(quote.buyAmount).toBe("8");
      expect(quote.totalFee).toBe("0.5");
    });

    it("handles missing fee object gracefully with string defaults", async () => {
      mockSep38Price.mockResolvedValue({
        price: "1.25",
        sell_amount: "10",
        buy_amount: "8",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const quote = await ramp.getPrice({
        sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
        buyAsset: "iso4217:USD",
        sellAmount: "10",
      });

      expect(quote.totalFee).toBe("0");
      expect(quote.feeAsset).toBe("");
    });
  });

  describe("Network error mapping", () => {
    it("maps 400 Bad Request to QUOTE_UNAVAILABLE", async () => {
      mockSep38Price.mockRejectedValue(
        new Error("Server request failed with error: 400 {'error':'Asset pair not supported'}")
      );

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      await expect(
        ramp.getPrice({
          sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
          buyAsset: "iso4217:USD",
          sellAmount: "5",
        })
      ).rejects.toMatchObject({
        code: "QUOTE_UNAVAILABLE",
      });
    });

    it("maps network connection failure to ANCHOR_UNREACHABLE", async () => {
      mockSep38Price.mockRejectedValue(new Error("Network Error: connect ECONNREFUSED"));

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      await expect(
        ramp.getPrice({
          sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
          buyAsset: "iso4217:USD",
          sellAmount: "5",
        })
      ).rejects.toMatchObject({
        code: "ANCHOR_UNREACHABLE",
      });
    });

    it("maps 401 Unauthorized to AUTH_FAILED", async () => {
      mockSep38Price.mockRejectedValue(
        new Error("Server request failed with error: 401 Unauthorized")
      );

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      await expect(
        ramp.getPrice({
          sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
          buyAsset: "iso4217:USD",
          sellAmount: "5",
        })
      ).rejects.toMatchObject({
        code: "AUTH_FAILED",
      });
    });

    it("maps signer rejection to SIGNER_REJECTED", async () => {
      mockSep10Authenticate.mockRejectedValue(new Error("User denied signing request"));

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      await expect(
        ramp.getPrice({
          sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
          buyAsset: "iso4217:USD",
          sellAmount: "5",
        })
      ).rejects.toMatchObject({
        code: "SIGNER_REJECTED",
      });
    });
  });
});

