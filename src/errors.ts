export type NairaRampErrorCode =
  | "AUTH_FAILED"
  | "ANCHOR_UNREACHABLE"
  | "ANCHOR_NOT_FOUND"
  | "KYC_REQUIRED"
  | "QUOTE_EXPIRED"
  | "QUOTE_UNAVAILABLE"
  | "UNSUPPORTED_ASSET"
  | "SIGNER_REJECTED"
  | "TRANSACTION_FAILED"
  | "MAINNET_NOT_ALLOWED"
  | "ANCHOR_NOT_VERIFIED";

export interface NairaRampErrorOptions {
  cause?: unknown;
}

export class NairaRampError extends Error {
  readonly code: NairaRampErrorCode;
  readonly cause?: unknown;

  constructor(
    code: NairaRampErrorCode,
    message: string,
    options?: NairaRampErrorOptions | unknown
  ) {
    const cause =
      options &&
      typeof options === "object" &&
      !(options instanceof Error) &&
      "cause" in options
        ? (options as { cause?: unknown }).cause
        : options !== undefined
        ? options
        : undefined;

    // @ts-expect-error TS2554: ES2022 Error constructor options { cause } is supported in runtime (Node 20+)
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = "NairaRampError";
    this.code = code;
    this.cause = cause;

    // Restore prototype chain for instanceof checks across transpiled/CJS builds
    Object.setPrototypeOf(this, NairaRampError.prototype);
  }
}

export function isNairaRampError(e: unknown): e is NairaRampError {
  if (e instanceof NairaRampError) {
    return true;
  }
  if (typeof e === "object" && e !== null && "name" in e && "code" in e) {
    return (
      (e as { name: unknown }).name === "NairaRampError" &&
      typeof (e as { code: unknown }).code === "string"
    );
  }
  return false;
}
