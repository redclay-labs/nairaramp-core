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

export interface GetPriceOptions {
  sellAsset: string;
  buyAsset: string;
  sellAmount?: string;
  buyAmount?: string;
  context?: "sep6" | "sep24" | "sep31";
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
    };
  };
  authenticate(): Promise<Types.AuthToken>;
}

export async function fetchPrice(
  options: GetPriceOptions,
  ctx: QuoteClientContext
): Promise<Quote> {
  const hasSell = options.sellAmount !== undefined && options.sellAmount !== "";
  const hasBuy = options.buyAmount !== undefined && options.buyAmount !== "";

  if ((hasSell && hasBuy) || (!hasSell && !hasBuy)) {
    throw new NairaRampError(
      "QUOTE_UNAVAILABLE",
      "Exactly one of sellAmount or buyAmount must be provided"
    );
  }

  if (!ctx.anchor.seps.includes("sep38")) {
    throw new NairaRampError(
      "QUOTE_UNAVAILABLE",
      `Anchor '${ctx.anchor.id}' does not support SEP-38 quotes`
    );
  }

  const sellAsset = options.sellAsset.trim();
  const buyAsset = options.buyAsset.trim();

  let token: Types.AuthToken;
  try {
    token = await ctx.authenticate();
  } catch (err) {
    if (err instanceof NairaRampError) {
      throw err;
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    if (
      errMsg.toLowerCase().includes("user denied") ||
      errMsg.toLowerCase().includes("signer rejected")
    ) {
      throw new NairaRampError("SIGNER_REJECTED", "Signer rejected authentication", { cause: err });
    }
    throw new NairaRampError("AUTH_FAILED", `Authentication failed: ${errMsg}`, { cause: err });
  }

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

    if (
      errMsg.includes("400") ||
      errMsg.includes("404") ||
      errMsg.toLowerCase().includes("quote") ||
      errMsg.toLowerCase().includes("unsupported")
    ) {
      throw new NairaRampError(
        "QUOTE_UNAVAILABLE",
        `Quote unavailable for ${sellAsset} -> ${buyAsset}: ${errMsg}`,
        { cause: err }
      );
    }

    throw new NairaRampError(
      "ANCHOR_UNREACHABLE",
      `Failed to communicate with anchor at ${ctx.anchor.homeDomain}: ${errMsg}`,
      { cause: err }
    );
  }
}

