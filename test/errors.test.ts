import { describe, it, expect } from "vitest";
import {
  NairaRampError,
  isNairaRampError,
  type NairaRampErrorCode,
} from "../src/index.js";

describe("NairaRampError", () => {
  it("creates error with correct code, message, and name", () => {
    const code: NairaRampErrorCode = "AUTH_FAILED";
    const err = new NairaRampError(code, "Authentication challenge failed");

    expect(err.code).toBe("AUTH_FAILED");
    expect(err.message).toBe("Authentication challenge failed");
    expect(err.name).toBe("NairaRampError");
  });

  it("preserves cause when passed in options object", () => {
    const original = new Error("Network timeout");
    const err = new NairaRampError("ANCHOR_UNREACHABLE", "Failed to connect to anchor", {
      cause: original,
    });

    expect(err.cause).toBe(original);
  });

  it("preserves cause when passed directly as cause argument", () => {
    const original = new Error("Signing key missing");
    const err = new NairaRampError("SIGNER_REJECTED", "User denied transaction", original);

    expect(err.cause).toBe(original);
  });

  it("leaves cause undefined when omitted", () => {
    const err = new NairaRampError("KYC_REQUIRED", "Customer verification required");
    expect(err.cause).toBeUndefined();
  });

  it("supports instanceof checks against NairaRampError and Error", () => {
    const err = new NairaRampError("QUOTE_EXPIRED", "SEP-38 quote has expired");

    expect(err instanceof NairaRampError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });
});

describe("isNairaRampError", () => {
  it("returns true for instances of NairaRampError", () => {
    const err = new NairaRampError("TRANSACTION_FAILED", "Transaction failed on network");
    expect(isNairaRampError(err)).toBe(true);
  });

  it("returns true for plain object copies with name and code", () => {
    const pseudoError = {
      name: "NairaRampError",
      code: "MAINNET_NOT_ALLOWED",
      message: "Mainnet anchor requested in testnet mode",
    };
    expect(isNairaRampError(pseudoError)).toBe(true);
  });

  it("returns false for standard Error instances", () => {
    const standardErr = new Error("Standard runtime error");
    expect(isNairaRampError(standardErr)).toBe(false);
  });

  it("returns false for plain objects missing name or code", () => {
    expect(isNairaRampError({})).toBe(false);
    expect(isNairaRampError({ name: "OtherError", code: "AUTH_FAILED" })).toBe(false);
    expect(isNairaRampError({ name: "NairaRampError" })).toBe(false);
    expect(isNairaRampError({ code: "AUTH_FAILED" })).toBe(false);
  });

  it("returns false for non-object primitive values", () => {
    expect(isNairaRampError(null)).toBe(false);
    expect(isNairaRampError(undefined)).toBe(false);
    expect(isNairaRampError("NairaRampError")).toBe(false);
    expect(isNairaRampError(123)).toBe(false);
  });
});
