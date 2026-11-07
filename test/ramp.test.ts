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
  mockAnchor,
  mockTestNet,
  mockMainNet,
} = vi.hoisted(() => {
  const mockSep10Authenticate = vi.fn();
  const mockSep10 = vi.fn().mockResolvedValue({
    authenticate: mockSep10Authenticate,
  });
  const mockAnchor = vi.fn().mockReturnValue({
    sep10: mockSep10,
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
    mockSep10.mockResolvedValue({
      authenticate: mockSep10Authenticate,
    });
    mockAnchor.mockReturnValue({
      sep10: mockSep10,
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
});
