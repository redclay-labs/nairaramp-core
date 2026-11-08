import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  Keypair,
  TransactionBuilder,
  Networks,
  Account,
  Operation,
  Asset,
  Horizon,
  Transaction,
} from "@stellar/stellar-sdk";
import {
  createRamp,
  isNairaRampError,
  type Signer,
} from "../src/index.js";
import * as registry from "../src/registry/index.js";

const {
  mockSep10Authenticate,
  mockSep10,
  mockSep24Deposit,
  mockSep24Withdraw,
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
  const mockSep24Withdraw = vi.fn();
  const mockSep24GetTransactionBy = vi.fn();
  const mockSep24 = vi.fn().mockReturnValue({
    deposit: mockSep24Deposit,
    withdraw: mockSep24Withdraw,
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
    mockSep24Withdraw,
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
    mockSep24Withdraw.mockReset();
    mockSep24GetTransactionBy.mockReset();
    mockSep10.mockResolvedValue({
      authenticate: mockSep10Authenticate,
    });
    mockSep24.mockReturnValue({
      deposit: mockSep24Deposit,
      withdraw: mockSep24Withdraw,
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
    const getAnchorSpy = vi.spyOn(registry, "getAnchor").mockReturnValue({
      id: "sdf-testanchor",
      name: "SDF Test Anchor",
      homeDomain: "testanchor.stellar.org",
      network: "mainnet",
      assets: [
        {
          code: "SRT",
          issuer: "GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
        },
      ],
      seps: ["sep10", "sep24"],
      countries: [],
      verifiedAt: "2026-10-01",
    });

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

    try {
      const ramp = createRamp({
        network: "mainnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
        allowMainnet: true,
        now: () => new Date("2026-10-01"),
      });

      const result = await ramp.authenticate();
      expect(result).toBe(token);
      expect(mockMainNet).toHaveBeenCalled();
    } finally {
      getAnchorSpy.mockRestore();
    }
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

  describe("withdraw", () => {
    it("throws UNSUPPORTED_ASSET immediately if asset is not in registry", async () => {
      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.withdraw({ assetCode: "NONEXISTENT" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("UNSUPPORTED_ASSET");
          expect(e.message).toContain("NONEXISTENT");
        }
      }

      expect(mockSep10Authenticate).not.toHaveBeenCalled();
      expect(mockSep24Withdraw).not.toHaveBeenCalled();
    });

    it("calls sep24.withdraw with amount and withdrawalAccount, returns id and url", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24Withdraw.mockResolvedValue({
        id: "with-123",
        url: "https://testanchor.stellar.org/sep24/interactive?id=with-123",
        type: "interactive_customer_info_needed",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const res = await ramp.withdraw({ assetCode: "SRT", amount: "50" });

      expect(res).toEqual({
        id: "with-123",
        url: "https://testanchor.stellar.org/sep24/interactive?id=with-123",
      });
      expect(mockSep10Authenticate).toHaveBeenCalled();
      expect(mockSep24Withdraw).toHaveBeenCalledWith({
        assetCode: "SRT",
        authToken: expect.objectContaining({ token }),
        withdrawalAccount: kp.publicKey(),
        extraFields: { amount: "50" },
      });
    });

    it("calls sep24.withdraw without amount, omitting extraFields", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24Withdraw.mockResolvedValue({
        id: "with-456",
        url: "https://testanchor.stellar.org/sep24/interactive?id=with-456",
        type: "interactive_customer_info_needed",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const res = await ramp.withdraw({ assetCode: "SRT" });

      expect(res.id).toBe("with-456");
      expect(mockSep24Withdraw).toHaveBeenCalledWith({
        assetCode: "SRT",
        authToken: expect.objectContaining({ token }),
        withdrawalAccount: kp.publicKey(),
      });
      const callArgs = mockSep24Withdraw.mock.calls[0]?.[0];
      expect(callArgs?.extraFields).toBeUndefined();
    });

    it("throws ANCHOR_UNREACHABLE on invalid withdraw response", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24Withdraw.mockResolvedValue({
        type: "error",
        error: "Withdraw unavailable",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.withdraw({ assetCode: "SRT" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("ANCHOR_UNREACHABLE");
          expect(e.message).toContain("Withdraw unavailable");
        }
      }
    });

    it("maps withdraw 401 error to AUTH_FAILED", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24Withdraw.mockRejectedValue(
        new Error("Request failed with status code 401")
      );

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.withdraw({ assetCode: "SRT" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("AUTH_FAILED");
        }
      }
    });

    it("maps withdraw network error to ANCHOR_UNREACHABLE", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24Withdraw.mockRejectedValue(new Error("connect ECONNREFUSED"));

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.withdraw({ assetCode: "SRT" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("ANCHOR_UNREACHABLE");
        }
      }
    });
  });

  describe("completeWithdrawal", () => {
    let destinationKp: Keypair;
    let feeStatsSpy: ReturnType<typeof vi.spyOn>;
    let loadAccountSpy: ReturnType<typeof vi.spyOn>;
    let submitTransactionSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      destinationKp = Keypair.random();
      feeStatsSpy = vi
        .spyOn(Horizon.Server.prototype, "feeStats")
        .mockResolvedValue({
          max_fee: { mode: "150" },
        } as unknown as Awaited<ReturnType<Horizon.Server["feeStats"]>>);
      loadAccountSpy = vi
        .spyOn(Horizon.Server.prototype, "loadAccount")
        .mockResolvedValue(
          new Account(
            kp.publicKey(),
            "100"
          ) as unknown as Horizon.AccountResponse
        );
      submitTransactionSpy = vi
        .spyOn(Horizon.Server.prototype, "submitTransaction")
        .mockResolvedValue({
          hash: "a1b2c3d4e5f67890123456789012345678901234567890123456789012345678",
        } as unknown as Awaited<
          ReturnType<Horizon.Server["submitTransaction"]>
        >);
    });

    afterEach(() => {
      feeStatsSpy.mockRestore();
      loadAccountSpy.mockRestore();
      submitTransactionSpy.mockRestore();
    });

    it("throws TRANSACTION_FAILED naming actual status if not pending_user_transfer_start", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24GetTransactionBy.mockResolvedValue({
        id: "w-wrong-status",
        status: "incomplete",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.completeWithdrawal("w-wrong-status");
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("TRANSACTION_FAILED");
          expect(e.message).toContain("incomplete");
          expect(e.message).toContain("pending_user_transfer_start");
        }
      }
    });

    it("throws TRANSACTION_FAILED if withdraw_anchor_account is missing", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24GetTransactionBy.mockResolvedValue({
        id: "w-no-dest",
        status: "pending_user_transfer_start",
        amount_in: "10.0",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.completeWithdrawal("w-no-dest");
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("TRANSACTION_FAILED");
          expect(e.message).toContain("withdraw_anchor_account");
        }
      }
    });

    it("builds payment with text memo and submits to Horizon", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24GetTransactionBy.mockResolvedValue({
        id: "w-text",
        status: "pending_user_transfer_start",
        amount_in: "25.00",
        withdraw_anchor_account: destinationKp.publicKey(),
        withdraw_memo: "sample-text-memo",
        withdraw_memo_type: "text",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const res = await ramp.completeWithdrawal("w-text");

      expect(res.hash).toBe(
        "a1b2c3d4e5f67890123456789012345678901234567890123456789012345678"
      );
      expect(loadAccountSpy).toHaveBeenCalledWith(kp.publicKey());
      expect(submitTransactionSpy).toHaveBeenCalled();

      const submittedTx: Transaction = submitTransactionSpy.mock.calls[0]?.[0];
      expect(submittedTx.memo.type).toBe("text");
      expect(
        Buffer.from(submittedTx.memo.value as Uint8Array).toString("utf8")
      ).toBe("sample-text-memo");
      expect(submittedTx.fee).toBe("150"); // From feeStats
    });

    it("builds payment with id memo", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24GetTransactionBy.mockResolvedValue({
        id: "w-id",
        status: "pending_user_transfer_start",
        amount_in: "15.00",
        withdraw_anchor_account: destinationKp.publicKey(),
        withdraw_memo: "987654321",
        withdraw_memo_type: "id",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const res = await ramp.completeWithdrawal("w-id");

      expect(res.hash).toBeDefined();
      const submittedTx: Transaction = submitTransactionSpy.mock.calls[0]?.[0];
      expect(submittedTx.memo.type).toBe("id");
      expect(String(submittedTx.memo.value)).toBe("987654321");
    });

    it("builds payment with hash memo (base64 decoded to 32 bytes)", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });

      const hashBuffer = Buffer.alloc(32, 9);
      const hashBase64 = hashBuffer.toString("base64");

      mockSep24GetTransactionBy.mockResolvedValue({
        id: "w-hash",
        status: "pending_user_transfer_start",
        amount_in: "30.00",
        withdraw_anchor_account: destinationKp.publicKey(),
        withdraw_memo: hashBase64,
        withdraw_memo_type: "hash",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const res = await ramp.completeWithdrawal("w-hash");

      expect(res.hash).toBeDefined();
      const submittedTx: Transaction = submitTransactionSpy.mock.calls[0]?.[0];
      expect(submittedTx.memo.type).toBe("hash");
      expect(
        Buffer.from(submittedTx.memo.value as Uint8Array).equals(hashBuffer)
      ).toBe(true);
    });

    it("throws TRANSACTION_FAILED if hash memo length is not 32 bytes", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });

      const invalidHashBase64 = Buffer.alloc(16, 1).toString("base64"); // only 16 bytes

      mockSep24GetTransactionBy.mockResolvedValue({
        id: "w-bad-hash",
        status: "pending_user_transfer_start",
        amount_in: "30.00",
        withdraw_anchor_account: destinationKp.publicKey(),
        withdraw_memo: invalidHashBase64,
        withdraw_memo_type: "hash",
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.completeWithdrawal("w-bad-hash");
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("TRANSACTION_FAILED");
          expect(e.message).toContain("expected 32 bytes");
        }
      }
    });

    it("builds payment with missing memo", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24GetTransactionBy.mockResolvedValue({
        id: "w-no-memo",
        status: "pending_user_transfer_start",
        amount_in: "40.00",
        withdraw_anchor_account: destinationKp.publicKey(),
        withdraw_memo: undefined,
        withdraw_memo_type: undefined,
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const res = await ramp.completeWithdrawal("w-no-memo");

      expect(res.hash).toBeDefined();
      const submittedTx: Transaction = submitTransactionSpy.mock.calls[0]?.[0];
      expect(submittedTx.memo.type).toBe("none");
    });

    it("falls back to 1000 stroops base fee if feeStats fails", async () => {
      feeStatsSpy.mockRejectedValue(new Error("Fee stats unavailable"));
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24GetTransactionBy.mockResolvedValue({
        id: "w-fee-fallback",
        status: "pending_user_transfer_start",
        amount_in: "10.00",
        withdraw_anchor_account: destinationKp.publicKey(),
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      const res = await ramp.completeWithdrawal("w-fee-fallback");

      expect(res.hash).toBeDefined();
      const submittedTx: Transaction = submitTransactionSpy.mock.calls[0]?.[0];
      expect(submittedTx.fee).toBe("1000"); // Fallback applied
    });

    it("maps Horizon submission failure to TRANSACTION_FAILED including result codes", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24GetTransactionBy.mockResolvedValue({
        id: "w-horizon-fail",
        status: "pending_user_transfer_start",
        amount_in: "10.00",
        withdraw_anchor_account: destinationKp.publicKey(),
      });

      submitTransactionSpy.mockRejectedValue({
        response: {
          data: {
            detail: "Transaction failed",
            extras: {
              result_codes: {
                transaction: "tx_failed",
                operations: ["op_underfunded"],
              },
            },
          },
        },
      });

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.completeWithdrawal("w-horizon-fail");
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("TRANSACTION_FAILED");
          expect(e.message).toContain("transaction=tx_failed");
          expect(e.message).toContain("operations=op_underfunded");
        }
      }
    });

    it("maps signer rejection during payment signing to SIGNER_REJECTED", async () => {
      const token = createJwt(Math.floor(Date.now() / 1000) + 3600);
      mockSep10Authenticate.mockResolvedValue({ token });
      mockSep24GetTransactionBy.mockResolvedValue({
        id: "w-signer-reject",
        status: "pending_user_transfer_start",
        amount_in: "10.00",
        withdraw_anchor_account: destinationKp.publicKey(),
      });

      mockSigner.signTransaction = vi
        .fn()
        .mockRejectedValue(new Error("User rejected payment on hardware wallet"));

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: mockSigner,
      });

      try {
        await ramp.completeWithdrawal("w-signer-reject");
        expect.fail("should have thrown");
      } catch (e) {
        expect(isNairaRampError(e)).toBe(true);
        if (isNairaRampError(e)) {
          expect(e.code).toBe("SIGNER_REJECTED");
        }
      }
    });
  });
});
