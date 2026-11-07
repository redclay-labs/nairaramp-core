import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  Keypair,
  TransactionBuilder,
  Networks,
  Account,
  Operation,
  Asset,
} from "@stellar/stellar-sdk";
import {
  createRamp,
  isNairaRampError,
  type Signer,
} from "../src/index.js";

const {
  mockSep10Authenticate,
  mockSep10,
  mockSep24Deposit,
  mockSep24GetTransactionBy,
  mockSep24,
  mockAnchor,
  mockTestNet,
  mockMainNet,
} = vi.hoisted(() => {
  const mockSep10Authenticate = vi.fn();
  const mockSep10 = vi.fn().mockResolvedValue({
    authenticate: mockSep10Authenticate,
  });
  const mockSep24Deposit = vi.fn();
  const mockSep24GetTransactionBy = vi.fn();
  const mockSep24 = vi.fn().mockReturnValue({
    deposit: mockSep24Deposit,
    getTransactionBy: mockSep24GetTransactionBy,
  });
  const mockAnchor = vi.fn().mockReturnValue({
    sep10: mockSep10,
    sep24: mockSep24,
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
    mockSep24Deposit,
    mockSep24GetTransactionBy,
    mockSep24,
    mockAnchor,
    mockTestNet,
    mockMainNet,
  };
});

vi.mock("@stellar/typescript-wallet-sdk", () => {
  return {
    Wallet: {
      TestNet: mockTestNet,
      MainNet: mockMainNet,
    },
    PublicKeypair: {
      fromPublicKey: (pk: string) => ({
        publicKey: pk,
      }),
    },
    Types: {
      AuthToken: {
        from: (token: string) => ({ token }),
      },
    },
  };
});

function createJwt(expSec: number): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: "https://testanchor.stellar.org/auth",
      sub: "GC...",
      exp: expSec,
    })
  ).toString("base64url");
  return `${header}.${payload}.sig`;
}

describe("createRamp", () => {
  let kp: Keypair;
  let mockSigner: Signer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSep10Authenticate.mockReset();
    mockSep10.mockReset();
    mockSep24Deposit.mockReset();
    mockSep24GetTransactionBy.mockReset();
    mockSep10.mockResolvedValue({
      authenticate: mockSep10Authenticate,
    });
    mockSep24.mockReturnValue({
      deposit: mockSep24Deposit,
      getTransactionBy: mockSep24GetTransactionBy,
    });
    mockAnchor.mockReturnValue({
      sep10: mockSep10,
      sep24: mockSep24,
    });
    mockTestNet.mockReturnValue({
      anchor: mockAnchor,
    });
    mockMainNet.mockReturnValue({
      anchor: mockAnchor,
    });

    kp = Keypair.random();
    mockSigner = {
      getPublicKey: vi.fn().mockResolvedValue(kp.publicKey()),
      signTransaction: vi.fn().mockImplementation(async (xdr, passphrase) => {
        const tx = TransactionBuilder.fromXDR(xdr, passphrase);
        tx.sign(kp);
        return tx.toXDR();
      }),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns authentication token and bridges signer", async () => {
    const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
    mockSep10Authenticate.mockImplementation(async ({ walletSigner }) => {
      const account = new Account(kp.publicKey(), "1");
      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: Keypair.random().publicKey(),
            asset: Asset.native(),
            amount: "1",
          })
        )
        .setTimeout(30)
        .build();

      await walletSigner.signWithClientAccount({ transaction: tx });
      expect(mockSigner.signTransaction).toHaveBeenCalledWith(
        expect.any(String),
        Networks.TESTNET
      );
      return { token };
    });

    const ramp = createRamp({
      network: "testnet",
      anchorId: "sdf-testanchor",
      signer: mockSigner,
    });

    const result = await ramp.authenticate();
    expect(result).toBe(token);
    expect(mockTestNet).toHaveBeenCalled();
  });

  it("uses correct network passphrase on mainnet", async () => {
    const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
    mockSep10Authenticate.mockImplementation(async ({ walletSigner }) => {
      const account = new Account(kp.publicKey(), "1");
      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: Networks.PUBLIC,
      })
        .addOperation(
          Operation.payment({
            destination: Keypair.random().publicKey(),
            asset: Asset.native(),
            amount: "1",
          })
        )
        .setTimeout(30)
        .build();

      await walletSigner.signWithClientAccount({ transaction: tx });
      expect(mockSigner.signTransaction).toHaveBeenCalledWith(
        expect.any(String),
        Networks.PUBLIC
      );
      return { token };
    });

    const ramp = createRamp({
      network: "mainnet",
      anchorId: "sdf-testanchor",
      signer: mockSigner,
    });

    const result = await ramp.authenticate();
    expect(result).toBe(token);
    expect(mockMainNet).toHaveBeenCalled();
  });

  it("reuses token before expiry without re-authenticating", async () => {
    const now = 1700000000;
    vi.useFakeTimers();
    vi.setSystemTime(now * 1000);

    const token = createJwt(now + 300); // expires in 300s
    mockSep10Authenticate.mockResolvedValue({ token });

    const ramp = createRamp({
      network: "testnet",
      anchorId: "sdf-testanchor",
      signer: mockSigner,
    });

    const first = await ramp.authenticate();
    expect(first).toBe(token);
    expect(mockSep10Authenticate).toHaveBeenCalledTimes(1);

    // Advance 100s (now is exp - 200s, well before exp - 60s)
    vi.advanceTimersByTime(100 * 1000);

    const second = await ramp.authenticate();
    expect(second).toBe(token);
    expect(mockSep10Authenticate).toHaveBeenCalledTimes(1);
  });

  it("refreshes token after expiry threshold (exp - 60s)", async () => {
    const now = 1700000000;
    vi.useFakeTimers();
    vi.setSystemTime(now * 1000);

    const token1 = createJwt(now + 300); // expires at now + 300s
    const token2 = createJwt(now + 600); // fresh token
    mockSep10Authenticate
      .mockResolvedValueOnce({ token: token1 })
      .mockResolvedValueOnce({ token: token2 });

    const ramp = createRamp({
      network: "testnet",
      anchorId: "sdf-testanchor",
      signer: mockSigner,
    });

    const first = await ramp.authenticate();
    expect(first).toBe(token1);
    expect(mockSep10Authenticate).toHaveBeenCalledTimes(1);

    // Advance 250s (now is at exp - 50s, within 60s threshold)
    vi.advanceTimersByTime(250 * 1000);

    const second = await ramp.authenticate();
    expect(second).toBe(token2);
    expect(mockSep10Authenticate).toHaveBeenCalledTimes(2);
  });

  it("maps network failure to ANCHOR_UNREACHABLE", async () => {
    mockSep10.mockRejectedValue(new Error("ENOTFOUND testanchor.stellar.org"));

    const ramp = createRamp({
      network: "testnet",
      anchorId: "sdf-testanchor",
      signer: mockSigner,
    });

    try {
      await ramp.authenticate();
      expect.fail("should have thrown");
    } catch (e) {
      expect(isNairaRampError(e)).toBe(true);
      if (isNairaRampError(e)) {
        expect(e.code).toBe("ANCHOR_UNREACHABLE");
        expect(e.cause).toBeDefined();
      }
    }
  });

  it("maps invalid or rejected challenge to AUTH_FAILED", async () => {
    mockSep10Authenticate.mockRejectedValue(
      new Error("Challenge validation failed: invalid server signature")
    );

    const ramp = createRamp({
      network: "testnet",
      anchorId: "sdf-testanchor",
      signer: mockSigner,
    });

    try {
      await ramp.authenticate();
      expect.fail("should have thrown");
    } catch (e) {
      expect(isNairaRampError(e)).toBe(true);
      if (isNairaRampError(e)) {
        expect(e.code).toBe("AUTH_FAILED");
        expect(e.cause).toBeDefined();
      }
    }
  });

  it("maps signer error to SIGNER_REJECTED", async () => {
    mockSigner.signTransaction = vi
      .fn()
      .mockRejectedValue(new Error("User denied signing"));

    mockSep10Authenticate.mockImplementation(async ({ walletSigner }) => {
      const account = new Account(kp.publicKey(), "1");
      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: Keypair.random().publicKey(),
            asset: Asset.native(),
            amount: "1",
          })
        )
        .setTimeout(30)
        .build();

      await walletSigner.signWithClientAccount({ transaction: tx });
      return { token: "unused" };
    });

    const ramp = createRamp({
      network: "testnet",
      anchorId: "sdf-testanchor",
      signer: mockSigner,
    });

    try {
      await ramp.authenticate();
      expect.fail("should have thrown");
    } catch (e) {
      expect(isNairaRampError(e)).toBe(true);
      if (isNairaRampError(e)) {
        expect(e.code).toBe("SIGNER_REJECTED");
        expect(e.cause).toBeDefined();
      }
    }
  });

  it("maps getPublicKey rejection to SIGNER_REJECTED", async () => {
    mockSigner.getPublicKey = vi
      .fn()
      .mockRejectedValue(new Error("Hardware wallet disconnected"));

    const ramp = createRamp({
      network: "testnet",
      anchorId: "sdf-testanchor",
      signer: mockSigner,
    });

    try {
      await ramp.authenticate();
      expect.fail("should have thrown");
    } catch (e) {
      expect(isNairaRampError(e)).toBe(true);
      if (isNairaRampError(e)) {
        expect(e.code).toBe("SIGNER_REJECTED");
        expect(e.cause).toBeDefined();
      }
    }
  });

  it("throws ANCHOR_NOT_FOUND on unknown anchor ID", () => {
    expect(() =>
      createRamp({
        network: "testnet",
        anchorId: "unknown-anchor-id",
        signer: mockSigner,
      })
    ).toThrowError(/Unknown anchor id: unknown-anchor-id/);
  });

  describe("deposit", () => {
    it("throws UNSUPPORTED_ASSET immediately if asset is not in registry", async () => {
      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.deposit({ assetCode: "NONEXISTENT" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("UNSUPPORTED_ASSET");
          expect(e.message).toContain("NONEXISTENT");
        }
      }

      // Must throw BEFORE any network call or SEP-10 auth
      expect(mockSep10Authenticate).not.toHaveBeenCalled();
      expect(mockSep24Deposit).not.toHaveBeenCalled();
    });

    it("authenticates and calls sep24.deposit with amount and destination account", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24Deposit.mockResolvedValue({
        id: "dep-123",
        url: "https://testanchor.stellar.org/sep24/interactive?id=dep-123",
        type: "interactive_customer_info_needed",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const res = await ramp.deposit({ assetCode: "SRT", amount: "25.50" });

      expect(res).toEqual({
        id: "dep-123",
        url: "https://testanchor.stellar.org/sep24/interactive?id=dep-123",
      });
      expect(mockSep10Authenticate).toHaveBeenCalled();
      expect(mockSep24Deposit).toHaveBeenCalledWith({
        assetCode: "SRT",
        authToken: expect.objectContaining({ token }),
        destinationAccount: kp.publicKey(),
        extraFields: { amount: "25.50" },
      });
    });

    it("omits extraFields if amount is not given", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24Deposit.mockResolvedValue({
        id: "dep-456",
        url: "https://testanchor.stellar.org/sep24/interactive?id=dep-456",
        type: "interactive_customer_info_needed",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const res = await ramp.deposit({ assetCode: "SRT" });

      expect(res.id).toBe("dep-456");
      expect(mockSep24Deposit).toHaveBeenCalledWith({
        assetCode: "SRT",
        authToken: expect.objectContaining({ token }),
        destinationAccount: kp.publicKey(),
      });
      const callArgs = mockSep24Deposit.mock.calls[0]?.[0];
      expect(callArgs?.extraFields).toBeUndefined();
    });

    it("throws ANCHOR_UNREACHABLE if response has missing id or url", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24Deposit.mockResolvedValue({
        type: "error",
        error: "Deposit service unavailable",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.deposit({ assetCode: "SRT" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("ANCHOR_UNREACHABLE");
          expect(e.message).toContain("Deposit service unavailable");
        }
      }
    });

    it("maps deposit network error to ANCHOR_UNREACHABLE", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24Deposit.mockRejectedValue(new Error("connect ECONNREFUSED"));

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.deposit({ assetCode: "SRT" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("ANCHOR_UNREACHABLE");
        }
      }
    });

    it("maps deposit 401 error to AUTH_FAILED", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24Deposit.mockRejectedValue(
        new Error("Request failed with status code 401")
      );

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.deposit({ assetCode: "SRT" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("AUTH_FAILED");
        }
      }
    });

    it("maps signer error during deposit to SIGNER_REJECTED", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSigner.getPublicKey = vi
        .fn()
        .mockRejectedValue(new Error("Signer rejected"));

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.deposit({ assetCode: "SRT" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("SIGNER_REJECTED");
        }
      }
    });
  });

  describe("getTransaction", () => {
    it("fetches transaction details via sep24.getTransactionBy", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      const mockTx = {
        id: "tx-789",
        status: "incomplete",
        amount_in: "100.00",
        amount_out: "98.50",
        stellar_transaction_id: "stellartx123",
        message: "Awaiting deposit",
      };
      mockSep24GetTransactionBy.mockResolvedValue(mockTx);

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const tx = await ramp.getTransaction("tx-789");

      expect(tx.id).toBe("tx-789");
      expect(tx.status).toBe("incomplete");
      expect(tx.amount_in).toBe("100.00");
      expect(mockSep24GetTransactionBy).toHaveBeenCalledWith({
        authToken: expect.objectContaining({ token }),
        id: "tx-789",
      });
    });

    it("maps getTransaction 401/unauthorized error to AUTH_FAILED", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24GetTransactionBy.mockRejectedValue(
        new Error("Request failed with status code 401")
      );

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.getTransaction("tx-789");
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("AUTH_FAILED");
        }
      }
    });

    it("maps getTransaction network error to ANCHOR_UNREACHABLE", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24GetTransactionBy.mockRejectedValue(
        new Error("Network timeout after 10000ms")
      );

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.getTransaction("tx-789");
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("ANCHOR_UNREACHABLE");
        }
      }
    });
  });
});
