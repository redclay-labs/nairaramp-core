import type { Anchor, Types } from "@stellar/typescript-wallet-sdk";
import type { AnchorEntry } from "./registry/schema.js";
import { NairaRampError } from "./errors.js";

export type KycStatus =
  | "ACCEPTED"
  | "PROCESSING"
  | "NEEDS_INFO"
  | "REJECTED"
  | "VERIFICATION_REQUIRED";

export interface KycField {
  type: string;
  description: string;
  choices?: string[];
  optional?: boolean;
}

export interface KycProvidedField extends KycField {
  status?: KycStatus;
  error?: string;
}

export interface KycStatusOptions {
  id?: string;
  type?: string;
  memo?: string;
  lang?: string;
  transactionId?: string;
}

export interface KycStatusResult {
  id?: string;
  status: KycStatus;
  fields?: Record<string, KycField>;
  providedFields?: Record<string, KycProvidedField>;
  message?: string;
}

export interface PutKycOptions {
  id?: string;
  type?: string;
  memo?: string;
  transactionId?: string;
  fields?: Record<string, string>;
  binaryFields?: Record<string, Uint8Array>;
}

export interface PutKycResult {
  id: string;
}

export interface KycClientContext {
  anchor: AnchorEntry;
  anchorClient: Anchor;
  authenticate: () => Promise<Types.AuthToken>;
}

function getHttpStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const record = err as {
    status?: number;
    response?: { status?: number };
  };
  return record.response?.status ?? record.status;
}

function isCustomerNotFoundError(err: unknown): boolean {
  if (getHttpStatus(err) === 404) return true;
  if (err instanceof Error && err.name === "CustomerNotFoundError") return true;
  return false;
}

function mapKycError(err: unknown, context: string): NairaRampError {
  if (err instanceof NairaRampError) return err;

  const status = getHttpStatus(err);
  if (status === 401 || status === 403) {
    return new NairaRampError(
      "AUTH_FAILED",
      `${context}: anchor authentication rejected (${status})`,
      { cause: err }
    );
  }

  if (isCustomerNotFoundError(err) || status === 400) {
    const message = err instanceof Error ? err.message : String(err);
    return new NairaRampError("KYC_REQUIRED", `${context}: ${message}`, {
      cause: err,
    });
  }

  const message = err instanceof Error ? err.message : String(err);
  return new NairaRampError("ANCHOR_UNREACHABLE", `${context}: ${message}`, {
    cause: err,
  });
}

function assertSep12Supported(anchor: AnchorEntry): void {
  if (!anchor.seps.includes("sep12")) {
    throw new NairaRampError(
      "ANCHOR_UNREACHABLE",
      `Anchor "${anchor.id}" does not advertise SEP-12 KYC support`
    );
  }
}

export async function fetchKycStatus(
  options: KycStatusOptions,
  ctx: KycClientContext
): Promise<KycStatusResult> {
  assertSep12Supported(ctx.anchor);

  const authToken = await ctx.authenticate();
  try {
    const sep12 = await ctx.anchorClient.sep12(authToken);
    const res = await sep12.getCustomer({
      id: options.id,
      type: options.type,
      memo: options.memo,
      lang: options.lang,
      transactionId: options.transactionId,
    });

    const result: KycStatusResult = {
      status: res.status as KycStatus,
    };

    if (res.id !== undefined) result.id = res.id;
    if (res.fields !== undefined) {
      result.fields = res.fields as Record<string, KycField>;
    }
    if (res.provided_fields !== undefined) {
      result.providedFields = res.provided_fields as Record<
        string,
        KycProvidedField
      >;
    }
    if (res.message !== undefined) result.message = res.message;

    return result;
  } catch (err) {
    throw mapKycError(err, `Failed to get KYC status for anchor "${ctx.anchor.id}"`);
  }
}

export async function submitKyc(
  options: PutKycOptions,
  ctx: KycClientContext
): Promise<PutKycResult> {
  assertSep12Supported(ctx.anchor);

  const hasFields =
    options.fields !== undefined && Object.keys(options.fields).length > 0;
  const hasBinaryFields =
    options.binaryFields !== undefined &&
    Object.keys(options.binaryFields).length > 0;

  if (!hasFields && !hasBinaryFields) {
    throw new NairaRampError(
      "KYC_REQUIRED",
      "At least one KYC field or binaryField is required"
    );
  }

  const authToken = await ctx.authenticate();
  try {
    const sep12 = await ctx.anchorClient.sep12(authToken);
    const params: Types.AddCustomerParams = {
      sep9Info: options.fields,
      sep9BinaryInfo: options.binaryFields,
      type: options.type,
      memo: options.memo,
      transactionId: options.transactionId,
    };

    const res = options.id
      ? await sep12.update({ ...params, id: options.id })
      : await sep12.add(params);

    return { id: res.id };
  } catch (err) {
    throw mapKycError(err, `Failed to submit KYC for anchor "${ctx.anchor.id}"`);
  }
}
