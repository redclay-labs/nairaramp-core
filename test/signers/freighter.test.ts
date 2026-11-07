import { describe, it, expect, vi, beforeEach } from "vitest";
import { freighterSigner } from "../../src/signers/freighter.js";
import { isNairaRampError } from "../../src/errors.js";

const { mockGetAddress, mockSignTransaction } = vi.hoisted(() => {
  return {
    mockGetAddress: vi.fn(),
    mockSignTransaction: vi.fn(),
  };
});

vi.mock("@stellar/freighter-api", () => {
  return {
    getAddress: mockGetAddress,
    signTransaction: mockSignTransaction,
    default: {
      getAddress: mockGetAddress,
      signTransaction: mockSignTransaction,
    },
  };
});

describe("freighterSigner", () => {
  const testAddress = "GBZZL7FR7M6337G2P6HAYL643JQ5CG6TYES5IGEQS3HD3LSDPHBLHIAE";
  const testXdr = "AAAAAgAAAAC...";
  const signedXdr = "AAAAAgAAAACsigned...";
  const passphrase = "Test SDF Network ; September 2015";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public key when getAddress resolves successfully", async () => {
    mockGetAddress.mockResolvedValue({ address: testAddress });
    const signer = freighterSigner();

    const pk = await signer.getPublicKey();
    expect(pk).toBe(testAddress);
    expect(mockGetAddress).toHaveBeenCalledTimes(1);
  });

  it("returns signed XDR when signTransaction resolves successfully", async () => {
    mockSignTransaction.mockResolvedValue({
      signedTxXdr: signedXdr,
      signerAddress: testAddress,
    });
    const signer = freighterSigner();

    const result = await signer.signTransaction(testXdr, passphrase);
    expect(result).toBe(signedXdr);
    expect(mockSignTransaction).toHaveBeenCalledWith(testXdr, {
      networkPassphrase: passphrase,
    });
  });

  it("maps getAddress rejection to SIGNER_REJECTED", async () => {
    mockGetAddress.mockRejectedValue(new Error("Freighter extension not found"));
    const signer = freighterSigner();

    try {
      await signer.getPublicKey();
      expect.fail("should have thrown");
    } catch (err) {
      expect(isNairaRampError(err)).toBe(true);
      if (isNairaRampError(err)) {
        expect(err.code).toBe("SIGNER_REJECTED");
        expect(err.message).toContain("Freighter extension not found");
      }
    }
  });

  it("maps getAddress error field response to SIGNER_REJECTED", async () => {
    mockGetAddress.mockResolvedValue({
      address: "",
      error: "User denied account access",
    });
    const signer = freighterSigner();

    try {
      await signer.getPublicKey();
      expect.fail("should have thrown");
    } catch (err) {
      expect(isNairaRampError(err)).toBe(true);
      if (isNairaRampError(err)) {
        expect(err.code).toBe("SIGNER_REJECTED");
        expect(err.message).toContain("User denied account access");
      }
    }
  });

  it("maps signTransaction rejection to SIGNER_REJECTED", async () => {
    mockSignTransaction.mockRejectedValue(new Error("User closed window"));
    const signer = freighterSigner();

    try {
      await signer.signTransaction(testXdr, passphrase);
      expect.fail("should have thrown");
    } catch (err) {
      expect(isNairaRampError(err)).toBe(true);
      if (isNairaRampError(err)) {
        expect(err.code).toBe("SIGNER_REJECTED");
        expect(err.message).toContain("User closed window");
      }
    }
  });

  it("maps signTransaction error field response to SIGNER_REJECTED", async () => {
    mockSignTransaction.mockResolvedValue({
      signedTxXdr: "",
      error: "User rejected signature request",
    });
    const signer = freighterSigner();

    try {
      await signer.signTransaction(testXdr, passphrase);
      expect.fail("should have thrown");
    } catch (err) {
      expect(isNairaRampError(err)).toBe(true);
      if (isNairaRampError(err)) {
        expect(err.code).toBe("SIGNER_REJECTED");
        expect(err.message).toContain("User rejected signature request");
      }
    }
  });
});

