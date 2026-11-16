import type { Types } from "@stellar/typescript-wallet-sdk";
import { NairaRampError } from "./errors.js";
import type { AnchorEntry } from "./registry/index.js";

export interface Quote {
  sellAsset: string;
  buyAsset: string;
  sellAmount: string;
  buyAmount: string;
  price: string;
  totalFee: string;
  feeAsset: string;
}

export interface FirmQuote extends Quote {
  id: string;
  expiresAt: string;
  totalPrice: string;
}

export interface GetPriceOptions {
  sellAsset: string;
  buyAsset: string;
  sellAmount?: string;
  buyAmount?: string;
  context?: "sep6" | "sep24" | "sep31";
}

export interface RequestQuoteOptions extends GetPriceOptions {
  expireAfter?: string;
  sellDeliveryMethod?: string;
  buyDeliveryMethod?: string;
  countryCode?: string;
}

export interface Sep38QuoteLike {
  id: string;
  expires_at: string;
  total_price: string | number;
  price: string | number;
  sell_asset: string;
  sell_amount: string | number;
  buy_asset: string;
  buy_amount: string | number;
  fee?: {
    total?: string | number;
    asset?: string;
  };
}

export interface QuoteClientContext {
  anchor: AnchorEntry;
  anchorClient: {
    sep38(authToken?: Types.AuthToken): {
      price(params: {
        sellAsset: string;
        buyAsset: string;
        sellAmount?: string;
        buyAmount?: string;
        context: Types.Sep38PriceContext;
      }): Promise<{
        price: string | number;
        total_price?: string | number;
        sell_amount: string | number;
        buy_amount: string | number;
        fee?: {
          total?: string | number;
          asset?: string;
        };
      }>;
      requestQuote?(params: Types.Sep38PostQuoteParams): Promise<Sep38QuoteLike>;
      getQuote?(quoteId: string): Promise<Sep38QuoteLike>;
    };
  };
  authenticate(): Promise<Types.AuthToken>;
}

function validateAmountPair(sellAmount?: string, buyAmount?: string): {
  hasSell: boolean;
  hasBuy: boolean;
} {
  const hasSell = sellAmount !== undefined && sellAmount !== "";
  const hasBuy = buyAmount !== undefined && buyAmount !== "";

  if ((hasSell && hasBuy) || (!hasSell && !hasBuy)) {
    throw new NairaRampError(
      "QUOTE_UNAVAILABLE",
      "Exactly one of sellAmount or buyAmount must be provided"
    );
  }
  return { hasSell, hasBuy };
}

function assertSep38Supported(anchor: AnchorEntry): void {
  if (!anchor.seps.includes("sep38")) {
    throw new NairaRampError(
      "QUOTE_UNAVAILABLE",
      `Anchor '${anchor.id}' does not support SEP-38 quotes`
    );
  }
}

async function authenticateForQuote(
  ctx: QuoteClientContext
): Promise<Types.AuthToken> {
  try {
    return await ctx.authenticate();
  } catch (err) {
    if (err instanceof NairaRampError) {
      throw err;
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    if (
      errMsg.toLowerCase().includes("user denied") ||
      errMsg.toLowerCase().includes("signer rejected")
    ) {
      throw new NairaRampError(
        "SIGNER_REJECTED",
        "Signer rejected authentication",
        { cause: err }
      );
    }
    throw new NairaRampError("AUTH_FAILED", `Authentication failed: ${errMsg}`, {
      cause: err,
    });
  }
}

function mapQuoteError(
  err: unknown,
  ctx: QuoteClientContext,
  subject: string
): never {
  if (err instanceof NairaRampError) {
    throw err;
  }

  const errName =
    err && typeof err === "object" && "name" in err
      ? String((err as { name: unknown }).name)
      : "";
  const errMsg = err instanceof Error ? err.message : String(err);

  if (
    errName.includes("Signer") ||
    errMsg.toLowerCase().includes("user denied") ||
    errMsg.toLowerCase().includes("signer rejected")
  ) {
    throw new NairaRampError("SIGNER_REJECTED", "Signer rejected transaction", {
      cause: err,
    });
  }

  if (
    errMsg.includes("401") ||
    errMsg.toLowerCase().includes("unauthorized") ||
    errMsg.toLowerCase().includes("authentication")
  ) {
    throw new NairaRampError("AUTH_FAILED", `Authentication failed: ${errMsg}`, {
      cause: err,
    });
  }

  if (errMsg.toLowerCase().includes("expired")) {
    throw new NairaRampError(
      "QUOTE_EXPIRED",
      `Quote expired for ${subject}: ${errMsg}`,
      { cause: err }
    );
  }

  if (
    errMsg.includes("400") ||
    errMsg.includes("404") ||
    errMsg.toLowerCase().includes("quote") ||
    errMsg.toLowerCase().includes("unsupported")
  ) {
    throw new NairaRampError(
      "QUOTE_UNAVAILABLE",
      `Quote unavailable for ${subject}: ${errMsg}`,
      { cause: err }
    );
  }

  throw new NairaRampError(
    "ANCHOR_UNREACHABLE",
    `Failed to communicate with anchor at ${ctx.anchor.homeDomain}: ${errMsg}`,
    { cause: err }
  );
}

function normalizeFirmQuote(resp: Sep38QuoteLike): FirmQuote {
  const expiresMs = Date.parse(resp.expires_at);
  if (!Number.isNaN(expiresMs) && expiresMs <= Date.now()) {
    throw new NairaRampError(
      "QUOTE_EXPIRED",
      `Quote "${resp.id}" expired at ${resp.expires_at}`
    );
  }

  return {
    id: resp.id,
    expiresAt: resp.expires_at,
    totalPrice: String(resp.total_price),
    sellAsset: resp.sell_asset,
    buyAsset: resp.buy_asset,
    sellAmount: String(resp.sell_amount),
    buyAmount: String(resp.buy_amount),
    price: String(resp.price),
    totalFee: String(resp.fee?.total ?? "0"),
    feeAsset: String(resp.fee?.asset ?? ""),
  };
}

export async function fetchPrice(
  options: GetPriceOptions,
  ctx: QuoteClientContext
): Promise<Quote> {
  const { hasSell, hasBuy } = validateAmountPair(
    options.sellAmount,
    options.buyAmount
  );
  assertSep38Supported(ctx.anchor);

  const sellAsset = options.sellAsset.trim();
  const buyAsset = options.buyAsset.trim();
  const token = await authenticateForQuote(ctx);

  try {
    const sep38Client = ctx.anchorClient.sep38(token);
    const resp = await sep38Client.price({
      sellAsset,
      buyAsset,
      ...(hasSell ? { sellAmount: options.sellAmount } : {}),
      ...(hasBuy ? { buyAmount: options.buyAmount } : {}),
      context: (options.context ?? "sep6") as Types.Sep38PriceContext,
    });

    return {
      sellAsset,
      buyAsset,
      sellAmount: String(resp.sell_amount),
      buyAmount: String(resp.buy_amount),
      price: String(resp.price),
      totalFee: String(resp.fee?.total ?? "0"),
      feeAsset: String(resp.fee?.asset ?? ""),
    };
  } catch (err) {
    mapQuoteError(err, ctx, `${sellAsset} -> ${buyAsset}`);
  }
}

export async function requestFirmQuote(
  options: RequestQuoteOptions,
  ctx: QuoteClientContext
): Promise<FirmQuote> {
  const { hasSell, hasBuy } = validateAmountPair(
    options.sellAmount,
    options.buyAmount
  );
  assertSep38Supported(ctx.anchor);

  const sellAsset = options.sellAsset.trim();
  const buyAsset = options.buyAsset.trim();
  const token = await authenticateForQuote(ctx);

  try {
    const sep38Client = ctx.anchorClient.sep38(token);
    if (!sep38Client.requestQuote) {
      throw new NairaRampError(
        "QUOTE_UNAVAILABLE",
        "Anchor SEP-38 client does not support firm quote requests"
      );
    }

    const params = {
      sell_asset: sellAsset,
      buy_asset: buyAsset,
      ...(hasSell ? { sell_amount: options.sellAmount } : {}),
      ...(hasBuy ? { buy_amount: options.buyAmount } : {}),
      context: (options.context ?? "sep6") as Types.Sep38PriceContext,
      ...(options.expireAfter ? { expire_after: options.expireAfter } : {}),
      ...(options.sellDeliveryMethod
        ? { sell_delivery_method: options.sellDeliveryMethod }
        : {}),
      ...(options.buyDeliveryMethod
        ? { buy_delivery_method: options.buyDeliveryMethod }
        : {}),
      ...(options.countryCode ? { country_code: options.countryCode } : {}),
    } as Types.Sep38PostQuoteParams;

    const resp = await sep38Client.requestQuote(params);
    return normalizeFirmQuote(resp);
  } catch (err) {
    mapQuoteError(err, ctx, `${sellAsset} -> ${buyAsset}`);
  }
}

export async function fetchQuoteById(
  quoteId: string,
  ctx: QuoteClientContext
): Promise<FirmQuote> {
  const trimmedId = quoteId.trim();
  if (!trimmedId) {
    throw new NairaRampError(
      "QUOTE_UNAVAILABLE",
      "quoteId must be a non-empty string"
    );
  }
  assertSep38Supported(ctx.anchor);

  const token = await authenticateForQuote(ctx);

  try {
    const sep38Client = ctx.anchorClient.sep38(token);
    if (!sep38Client.getQuote) {
      throw new NairaRampError(
        "QUOTE_UNAVAILABLE",
        "Anchor SEP-38 client does not support fetching quotes by ID"
      );
    }

    const resp = await sep38Client.getQuote(trimmedId);
    return normalizeFirmQuote(resp);
  } catch (err) {
    mapQuoteError(err, ctx, `quote "${trimmedId}"`);
  }
}
