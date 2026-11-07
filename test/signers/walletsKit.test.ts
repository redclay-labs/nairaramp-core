import { describe, it, expect, vi, beforeEach } from "vitest";
import { walletsKitSigner, type WalletsKitLike } from "../../src/signers/walletsKit.js";
import { isNairaRampError } from "../../src/errors.js";

describe("walletsKitSigner", () => {
  const testAddress = "GBZZL7FR7M6337G2P6HAYL643JQ5CG6TYES5IGEQS3HD3LSDPHBLHIAE";
  const testXdr = "AAAAAgAAAACtestXDR...";
  const signedXdr = "AAAAAgAAAACsignedXDR...";
  const passphrase = "Test SDF Network ; September 2015";

  let mockKit: {
    getAddress: ReturnType<typeof vi.fn>;
    signTransaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockKit = {
      getAddress: vi.fn(),
      signTransaction: vi.fn(),
    };
  });

  it("returns public key from kit getAddress", async () => {
    mockKit.getAddress.mockResolvedValue({ address: testAddress });
    const signer = walletsKitSigner(mockKit as unknown as WalletsKitLike);

    const pk = await signer.getPublicKey();
    expect(pk).toBe(testAddress);
    expect(mockKit.getAddress).toHaveBeenCalledTimes(1);
  });

  it("returns public key when address() method is provided instead", async () => {
    const kitWithAddress = {
      address: vi.fn().mockResolvedValue({ address: testAddress }),
      signTransaction: vi.fn(),
    };
    const signer = walletsKitSigner(kitWithAddress as unknown as WalletsKitLike);

    const pk = await signer.getPublicKey();
    expect(pk).toBe(testAddress);
  });

  it("returns signed XDR passing networkPassphrase and address", async () => {
    mockKit.getAddress.mockResolvedValue({ address: testAddress });
    mockKit.signTransaction.mockResolvedValue({ signedTxXdr: signedXdr });
    const signer = walletsKitSigner(mockKit as unknown as WalletsKitLike);

    const result = await signer.signTransaction(testXdr, passphrase);
    expect(result).toBe(signedXdr);
    expect(mockKit.signTransaction).toHaveBeenCalledWith(testXdr, {
      networkPassphrase: passphrase,
      address: testAddress,
    });
  });

  it("maps kit getAddress rejection to SIGNER_REJECTED", async () => {
    mockKit.getAddress.mockRejectedValue(new Error("No wallet connected"));
    const signer = walletsKitSigner(mockKit as unknown as WalletsKitLike);

    try {
      await signer.getPublicKey();
      expect.fail("should have thrown");
    } catch (err) {
      expect(isNairaRampError(err)).toBe(true);
      if (isNairaRampError(err)) {
        expect(err.code).toBe("SIGNER_REJECTED");
        expect(err.message).toContain("No wallet connected");
      }
    }
  });

  it("maps kit getAddress error-field response to SIGNER_REJECTED", async () => {
    mockKit.getAddress.mockResolvedValue({
      address: "",
      error: "Wallet locked",
    });
    const signer = walletsKitSigner(mockKit as unknown as WalletsKitLike);

    try {
      await signer.getPublicKey();
      expect.fail("should have thrown");
    } catch (err) {
      expect(isNairaRampError(err)).toBe(true);
      if (isNairaRampError(err)) {
        expect(err.code).toBe("SIGNER_REJECTED");
        expect(err.message).toContain("Wallet locked");
      }
    }
  });

  it("maps kit signTransaction rejection to SIGNER_REJECTED", async () => {
    mockKit.getAddress.mockResolvedValue({ address: testAddress });
    mockKit.signTransaction.mockRejectedValue(new Error("User dismissed modal"));
    const signer = walletsKitSigner(mockKit as unknown as WalletsKitLike);

    try {
      await signer.signTransaction(testXdr, passphrase);
      expect.fail("should have thrown");
    } catch (err) {
      expect(isNairaRampError(err)).toBe(true);
      if (isNairaRampError(err)) {
        expect(err.code).toBe("SIGNER_REJECTED");
        expect(err.message).toContain("User dismissed modal");
      }
    }
  });

  it("maps kit signTransaction error-field response to SIGNER_REJECTED", async () => {
    mockKit.getAddress.mockResolvedValue({ address: testAddress });
    mockKit.signTransaction.mockResolvedValue({
      signedTxXdr: "",
      error: "Hardware wallet declined transaction",
    });
    const signer = walletsKitSigner(mockKit as unknown as WalletsKitLike);

    try {
      await signer.signTransaction(testXdr, passphrase);
      expect.fail("should have thrown");
    } catch (err) {
      expect(isNairaRampError(err)).toBe(true);
      if (isNairaRampError(err)) {
        expect(err.code).toBe("SIGNER_REJECTED");
        expect(err.message).toContain("Hardware wallet declined transaction");
      }
    }
  });
});

