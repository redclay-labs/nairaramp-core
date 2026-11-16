import type { Anchor, Types } from "@stellar/typescript-wallet-sdk";
import type { AnchorEntry } from "./registry/schema.js";
import { NairaRampError } from "./errors.js";

export interface Sep6DepositOptions {
  assetCode: string;
  account?: string;
  amount?: string;
  type?: string;
  emailAddress?: string;
  memoType?: string;
  memo?: string;
  lang?: string;
  countryCode?: string;
  customerId?: string;
  claimableBalanceSupported?: boolean;
}

export interface Sep6DepositResult {
  id?: string;
  how?: string;
  instructions?: Record<string, { value: string; description: string }>;
  eta?: number;
  minAmount?: number;
  maxAmount?: number;
  feeFixed?: number;
  feePercent?: number;
  extraInfo?: { message?: string };
  status?: string;
  moreInfoUrl?: string;
}

export interface Sep6WithdrawOptions {
  assetCode: string;
  type: string;
  dest?: string;
  destExtra?: string;
  account?: string;
  amount?: string;
  memo?: string;
  lang?: string;
  countryCode?: string;
  refundMemo?: string;
  refundMemoType?: string;
  customerId?: string;
}

export interface Sep6WithdrawResult {
  id?: string;
  accountId?: string;
  memoType?: string;
  memo?: string;
  eta?: number;
  minAmount?: number;
  maxAmount?: number;
  feeFixed?: number;
  feePercent?: number;
  extraInfo?: { message?: string };
  status?: string;
  moreInfoUrl?: string;
}

export interface Sep6ClientContext {
  anchor: AnchorEntry;
  anchorClient: Anchor;
  account: string;
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

function getResponseData(err: unknown): Record<string, unknown> | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const record = err as { response?: { data?: unknown } };
  if (
    record.response?.data &&
    typeof record.response.data === "object"
  ) {
    return record.response.data as Record<string, unknown>;
  }
  return undefined;
}

function assertSep6AndAsset(anchor: AnchorEntry, assetCode: string): void {
  if (!anchor.seps.includes("sep6")) {
    throw new NairaRampError(
      "ANCHOR_UNREACHABLE",
      `Anchor "${anchor.id}" does not advertise SEP-6 transfer support`
    );
  }
  if (!anchor.assets.some((a) => a.code === assetCode)) {
    throw new NairaRampError(
      "UNSUPPORTED_ASSET",
      `Asset "${assetCode}" is not supported by anchor "${anchor.id}"`
    );
  }
}

function isMissingKycResponse(
  res: Types.Sep6DepositResponse | Types.Sep6WithdrawResponse
): res is Types.Sep6MissingKYC {
  return (
    "fields" in res &&
    Array.isArray((res as Types.Sep6MissingKYC).fields)
  );
}

function isPendingResponse(
  res: Types.Sep6DepositResponse | Types.Sep6WithdrawResponse
): res is Types.Sep6Pending {
  return "status" in res && typeof (res as Types.Sep6Pending).status === "string";
}

function mapSep6Error(err: unknown, context: string): NairaRampError {
  if (err instanceof NairaRampError) return err;

  const data = getResponseData(err);
  const typeStr = typeof data?.type === "string" ? data.type : "";
  const message = err instanceof Error ? err.message : String(err);

  if (
    typeStr.includes("customer_info_needed") ||
    message.includes("customer_info_needed") ||
    message.includes("needs_kyc")
  ) {
    const fields = Array.isArray(data?.fields)
      ? (data.fields as string[]).join(", ")
      : "";
    const detail = fields ? `${message} (fields: ${fields})` : message;
    return new NairaRampError("KYC_REQUIRED", `${context}: ${detail}`, {
      cause: err,
    });
  }

  const status = getHttpStatus(err);
  if (status === 401 || status === 403) {
    return new NairaRampError(
      "AUTH_FAILED",
      `${context}: anchor authentication rejected (${status})`,
      { cause: err }
    );
  }

  return new NairaRampError("ANCHOR_UNREACHABLE", `${context}: ${message}`, {
    cause: err,
  });
}

export async function performSep6Deposit(
  options: Sep6DepositOptions,
  ctx: Sep6ClientContext
): Promise<Sep6DepositResult> {
  assertSep6AndAsset(ctx.anchor, options.assetCode);

  const authToken = await ctx.authenticate();
  try {
    const sep6 = ctx.anchorClient.sep6();
    const params: Types.Sep6DepositParams = {
      asset_code: options.assetCode,
      account: options.account ?? ctx.account,
    };
    if (options.amount !== undefined) params.amount = options.amount;
    if (options.type !== undefined) params.type = options.type;
    if (options.emailAddress !== undefined) {
      params.email_address = options.emailAddress;
    }
    if (options.memoType !== undefined) params.memo_type = options.memoType;
    if (options.memo !== undefined) params.memo = options.memo;
    if (options.lang !== undefined) params.lang = options.lang;
    if (options.countryCode !== undefined) {
      params.country_code = options.countryCode;
    }
    if (options.customerId !== undefined) {
      params.customer_id = options.customerId;
    }
    if (options.claimableBalanceSupported !== undefined) {
      params.claimable_balance_supported = String(
        options.claimableBalanceSupported
      );
    }

    const res = await sep6.deposit({ authToken, params });

    if (isMissingKycResponse(res)) {
      throw new NairaRampError(
        "KYC_REQUIRED",
        `SEP-6 deposit requires customer KYC info (${res.type}): ${res.fields.join(", ")}`
      );
    }

    if (isPendingResponse(res)) {
      return {
        status: res.status,
        moreInfoUrl: res.more_info_url,
        eta: res.eta,
      };
    }

    return {
      id: res.id,
      how: res.how,
      instructions: res.instructions,
      eta: res.eta,
      minAmount: res.min_amoun,
      maxAmount: res.max_amount,
      feeFixed: res.fee_fixed,
      feePercent: res.fee_percent,
      extraInfo: res.extra_info,
    };
  } catch (err) {
    throw mapSep6Error(
      err,
      `SEP-6 deposit failed for anchor "${ctx.anchor.id}"`
    );
  }
}

export async function performSep6Withdraw(
  options: Sep6WithdrawOptions,
  ctx: Sep6ClientContext
): Promise<Sep6WithdrawResult> {
  assertSep6AndAsset(ctx.anchor, options.assetCode);

  const authToken = await ctx.authenticate();
  try {
    const sep6 = ctx.anchorClient.sep6();
    const params: Types.Sep6WithdrawParams = {
      asset_code: options.assetCode,
      type: options.type,
    };
    if (options.dest !== undefined) params.dest = options.dest;
    if (options.destExtra !== undefined) params.dest_extra = options.destExtra;
    if (options.account !== undefined) {
      params.account = options.account;
    } else {
      params.account = ctx.account;
    }
    if (options.amount !== undefined) params.amount = options.amount;
    if (options.memo !== undefined) params.memo = options.memo;
    if (options.lang !== undefined) params.lang = options.lang;
    if (options.countryCode !== undefined) {
      params.country_code = options.countryCode;
    }
    if (options.refundMemo !== undefined) {
      params.refund_memo = options.refundMemo;
    }
    if (options.refundMemoType !== undefined) {
      params.refund_memo_type = options.refundMemoType;
    }
    if (options.customerId !== undefined) {
      params.customer_id = options.customerId;
    }

    const res = await sep6.withdraw({ authToken, params });

    if (isMissingKycResponse(res)) {
      throw new NairaRampError(
        "KYC_REQUIRED",
        `SEP-6 withdraw requires customer KYC info (${res.type}): ${res.fields.join(", ")}`
      );
    }

    if (isPendingResponse(res)) {
      return {
        status: res.status,
        moreInfoUrl: res.more_info_url,
        eta: res.eta,
      };
    }

    return {
      id: res.id,
      accountId: res.account_id,
      memoType: res.memo_type,
      memo: res.memo,
      eta: res.eta,
      minAmount: res.min_amount,
      maxAmount: res.max_amount,
      feeFixed: res.fee_fixed,
      feePercent: res.fee_percent,
      extraInfo: res.extra_info,
    };
  } catch (err) {
    throw mapSep6Error(
      err,
      `SEP-6 withdraw failed for anchor "${ctx.anchor.id}"`
    );
  }
}

