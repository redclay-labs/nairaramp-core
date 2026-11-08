import {
  Asset,
  Horizon,
  Memo,
  type MemoType,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  PublicKeypair,
  Types,
  Wallet,
  type WalletSigner,
} from "@stellar/typescript-wallet-sdk";
import { getAnchor } from "./registry/index.js";
import { isNairaRampError, NairaRampError } from "./errors.js";
import type { Signer } from "./signers/types.js";
import {
  watchTransaction,
  type WatchHandlers,
  type WatchSubscription,
} from "./watcher.js";
import {
  fetchPrice,
  type GetPriceOptions,
  type Quote,
} from "./quotes.js";
import { assertNetworkAllowed } from "./guard.js";

type SdkAnchorTx = Types.DepositTransaction & Types.WithdrawTransaction;

export type AnchorTransaction = Pick<
  SdkAnchorTx,
  | "id"
  | "status"
  | "amount_in"
  | "amount_out"
  | "withdraw_anchor_account"
  | "withdraw_memo"
  | "withdraw_memo_type"
  | "stellar_transaction_id"
  | "message"
>;

export interface DepositOptions {
  assetCode: string;
  amount?: string;
}

export interface WithdrawOptions {
  assetCode: string;
  amount?: string;
}

export interface CreateRampOptions {
  network: "testnet" | "mainnet";
  anchorId: string;
  signer: Signer;
  allowMainnet?: boolean;
  now?: () => Date;
}

export interface Ramp {
  authenticate(): Promise<string>;
  deposit(options: DepositOptions): Promise<{ id: string; url: string }>;
  withdraw(options: WithdrawOptions): Promise<{ id: string; url: string }>;
  getTransaction(id: string): Promise<AnchorTransaction>;
  completeWithdrawal(id: string): Promise<{ hash: string }>;
  watch(id: string, handlers: WatchHandlers): WatchSubscription;
  getPrice(options: GetPriceOptions): Promise<Quote>;
}

export type { GetPriceOptions, Quote };

function resolvePaymentAsset(
  tx: AnchorTransaction,
  anchorEntryAssets: Array<{ code: string; issuer: string }>
): Asset {
  const rawAsset = tx as unknown as {
    amount_in_asset?: string;
    asset_code?: string;
    withdraw_asset?: string;
  };
  const assetStr =
    rawAsset.amount_in_asset ||
    rawAsset.asset_code ||
    rawAsset.withdraw_asset ||
    "";

  if (assetStr === "native") {
    return Asset.native();
  }

  if (assetStr.startsWith("stellar:")) {
    const parts = assetStr.split(":");
    if (parts.length >= 3 && parts[1] && parts[2]) {
      return new Asset(parts[1], parts[2]);
    }
    if (parts.length >= 2 && parts[1] === "native") {
      return Asset.native();
    }
  }

  const matched = anchorEntryAssets.find((a) => a.code === assetStr);
  if (matched) {
    return new Asset(matched.code, matched.issuer);
  }

  if (anchorEntryAssets.length > 0) {
    const first = anchorEntryAssets[0]!;
    return new Asset(first.code, first.issuer);
  }

  return Asset.native();
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) {
      return null;
    }
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64.padEnd(base64.length + padLength, "=");
    const jsonStr =
      typeof Buffer !== "undefined"
        ? Buffer.from(padded, "base64").toString("utf8")
        : atob(padded);
    return JSON.parse(jsonStr) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function mapAnchorError(
  err: unknown,
  homeDomain: string,
  signerError?: unknown
): never {
  if (isNairaRampError(err)) {
    throw err;
  }
  if (signerError) {
    throw new NairaRampError(
      "SIGNER_REJECTED",
      "Signer rejected or failed during transaction signing",
      { cause: signerError }
    );
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
    throw new NairaRampError(
      "SIGNER_REJECTED",
      "Signer rejected transaction",
      { cause: err }
    );
  }

  if (
    errName.includes("Challenge") ||
    errName.includes("Passphrase") ||
    errName.includes("DomainSigning") ||
    errMsg.includes("challenge") ||
    errMsg.includes("Challenge") ||
    errMsg.includes("passphrase") ||
    errMsg.includes("Passphrase") ||
    errMsg.includes("400") ||
    errMsg.includes("401") ||
    errMsg.includes("403") ||
    errMsg.toLowerCase().includes("unauthorized") ||
    errMsg.toLowerCase().includes("authentication")
  ) {
    throw new NairaRampError(
      "AUTH_FAILED",
      `Authentication failed: ${errMsg}`,
      { cause: err }
    );
  }

  throw new NairaRampError(
    "ANCHOR_UNREACHABLE",
    `Failed to communicate with anchor at ${homeDomain}: ${errMsg}`,
    { cause: err }
  );
}

export function createRamp({
  network,
  anchorId,
  signer,
  allowMainnet,
  now,
}: CreateRampOptions): Ramp {
  const anchorEntry = getAnchor(anchorId);

  assertNetworkAllowed({
    network,
    anchor: anchorEntry,
    allowMainnet,
    now,
  });

  const wallet = network === "mainnet" ? Wallet.MainNet() : Wallet.TestNet();
  const anchorClient = wallet.anchor({ homeDomain: anchorEntry.homeDomain });
  const networkPassphrase =
    network === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;

  let cachedToken: string | null = null;
  let cachedTokenExpSec: number | null = null;

  const ramp: Ramp = {
    async authenticate(): Promise<string> {
      const nowSec = Math.floor(Date.now() / 1000);
      if (
        cachedToken &&
        cachedTokenExpSec !== null &&
        nowSec < cachedTokenExpSec - 60
      ) {
        return cachedToken;
      }

      let publicKey: string;
      try {
        publicKey = await signer.getPublicKey();
      } catch (err) {
        throw new NairaRampError(
          "SIGNER_REJECTED",
          "Signer failed to provide public key",
          { cause: err }
        );
      }

      const accountKp = PublicKeypair.fromPublicKey(publicKey);

      let signerError: unknown = null;
      let pendingSign: Promise<Transaction> | null = null;

      const walletSigner: WalletSigner = {
        signWithClientAccount: ({ transaction }) => {
          pendingSign = (async () => {
            try {
              const existingCount = transaction.signatures.length;
              const xdr = transaction.toXDR();
              const signedXdr = await signer.signTransaction(
                xdr,
                networkPassphrase
              );
              const signedTx = TransactionBuilder.fromXDR(
                signedXdr,
                networkPassphrase
              ) as Transaction;
              const newSigs = signedTx.signatures.slice(existingCount);
              transaction.signatures.push(...newSigs);
              return transaction;
            } catch (err) {
              signerError = err;
              throw err;
            }
          })();
          return pendingSign as unknown as Transaction;
        },
        signWithDomainAccount: async ({ transactionXDR }) => {
          try {
            const signedXdr = await signer.signTransaction(
              transactionXDR,
              networkPassphrase
            );
            return TransactionBuilder.fromXDR(
              signedXdr,
              networkPassphrase
            ) as Transaction;
          } catch (err) {
            signerError = err;
            throw err;
          }
        },
      };

      try {
        const sep10 = await anchorClient.sep10();
        const sep10Internal = sep10 as unknown as {
          sign?: (params: unknown) => Promise<Transaction>;
        };
        const origSign = sep10Internal.sign;
        if (typeof origSign === "function") {
          sep10Internal.sign = async function (params: unknown) {
            const tx = await origSign.call(this, params);
            if (pendingSign) {
              await pendingSign;
            }
            return tx;
          };
        }

        const result = await sep10.authenticate({
          accountKp,
          walletSigner,
        });

        const token = typeof result === "string" ? result : result.token;
        if (!token || typeof token !== "string") {
          throw new NairaRampError(
            "AUTH_FAILED",
            "Authentication returned invalid token"
          );
        }

        const payload = decodeJwtPayload(token);
        const exp = typeof payload?.exp === "number" ? payload.exp : null;

        cachedToken = token;
        cachedTokenExpSec = exp;

        return token;
      } catch (err) {
        mapAnchorError(err, anchorEntry.homeDomain, signerError);
      }
    },

    async deposit(options: DepositOptions): Promise<{ id: string; url: string }> {
      const { assetCode, amount } = options;

      const isSupported = anchorEntry.assets.some((a) => a.code === assetCode);
      if (!isSupported) {
        throw new NairaRampError(
          "UNSUPPORTED_ASSET",
          `Asset ${assetCode} is not supported by anchor ${anchorEntry.id}`
        );
      }

      const token = await ramp.authenticate();

      let destinationAccount: string;
      try {
        destinationAccount = await signer.getPublicKey();
      } catch (err) {
        throw new NairaRampError(
          "SIGNER_REJECTED",
          "Signer failed to provide public key",
          { cause: err }
        );
      }

      try {
        const authToken = Types.AuthToken.from(token);
        const sep24 = anchorClient.sep24();

        const depositParams: {
          assetCode: string;
          authToken: Types.AuthToken;
          destinationAccount: string;
          extraFields?: { [key: string]: string };
        } = {
          assetCode,
          authToken,
          destinationAccount,
        };
        if (amount !== undefined) {
          depositParams.extraFields = { amount };
        }

        const resp = await sep24.deposit(depositParams);

        if (!resp || !resp.id || !resp.url) {
          const detail = resp?.error ? `: ${resp.error}` : "";
          throw new NairaRampError(
            "ANCHOR_UNREACHABLE",
            `Anchor at ${anchorEntry.homeDomain} returned invalid SEP-24 deposit response${detail}`
          );
        }

        return { id: resp.id, url: resp.url };
      } catch (err) {
        mapAnchorError(err, anchorEntry.homeDomain);
      }
    },

    async withdraw(
      options: WithdrawOptions
    ): Promise<{ id: string; url: string }> {
      const { assetCode, amount } = options;

      const isSupported = anchorEntry.assets.some((a) => a.code === assetCode);
      if (!isSupported) {
        throw new NairaRampError(
          "UNSUPPORTED_ASSET",
          `Asset ${assetCode} is not supported by anchor ${anchorEntry.id}`
        );
      }

      const token = await ramp.authenticate();

      let withdrawalAccount: string;
      try {
        withdrawalAccount = await signer.getPublicKey();
      } catch (err) {
        throw new NairaRampError(
          "SIGNER_REJECTED",
          "Signer failed to provide public key",
          { cause: err }
        );
      }

      try {
        const authToken = Types.AuthToken.from(token);
        const sep24 = anchorClient.sep24();

        const withdrawParams: {
          assetCode: string;
          authToken: Types.AuthToken;
          withdrawalAccount: string;
          extraFields?: { [key: string]: string };
        } = {
          assetCode,
          authToken,
          withdrawalAccount,
        };
        if (amount !== undefined) {
          withdrawParams.extraFields = { amount };
        }

        const resp = await sep24.withdraw(withdrawParams);

        if (!resp || !resp.id || !resp.url) {
          const detail = resp?.error ? `: ${resp.error}` : "";
          throw new NairaRampError(
            "ANCHOR_UNREACHABLE",
            `Anchor at ${anchorEntry.homeDomain} returned invalid SEP-24 withdraw response${detail}`
          );
        }

        return { id: resp.id, url: resp.url };
      } catch (err) {
        mapAnchorError(err, anchorEntry.homeDomain);
      }
    },

    async getTransaction(id: string): Promise<AnchorTransaction> {
      const token = await ramp.authenticate();

      try {
        const authToken = Types.AuthToken.from(token);
        const sep24 = anchorClient.sep24();
        const tx = await sep24.getTransactionBy({ authToken, id });

        return tx as unknown as AnchorTransaction;
      } catch (err) {
        mapAnchorError(err, anchorEntry.homeDomain);
      }
    },

    async completeWithdrawal(id: string): Promise<{ hash: string }> {
      const tx = await ramp.getTransaction(id);

      if (tx.status !== "pending_user_transfer_start") {
        throw new NairaRampError(
          "TRANSACTION_FAILED",
          `Transaction ${id} is in status '${tx.status}', expected 'pending_user_transfer_start'`
        );
      }

      if (!tx.withdraw_anchor_account) {
        throw new NairaRampError(
          "TRANSACTION_FAILED",
          `Transaction ${id} is missing withdraw_anchor_account`
        );
      }

      if (!tx.amount_in) {
        throw new NairaRampError(
          "TRANSACTION_FAILED",
          `Transaction ${id} is missing amount_in`
        );
      }

      let memo: Memo = Memo.none();
      if (tx.withdraw_memo && tx.withdraw_memo_type) {
        const memoType = String(tx.withdraw_memo_type).toLowerCase();
        if (memoType === "text") {
          memo = Memo.text(tx.withdraw_memo);
        } else if (memoType === "id") {
          memo = Memo.id(tx.withdraw_memo);
        } else if (memoType === "hash") {
          const buffer = Buffer.from(tx.withdraw_memo, "base64");
          if (buffer.length !== 32) {
            throw new NairaRampError(
              "TRANSACTION_FAILED",
              `Invalid hash memo length: expected 32 bytes, got ${buffer.length}`
            );
          }
          memo = Memo.hash(buffer);
        } else {
          memo = new Memo(tx.withdraw_memo_type as MemoType, tx.withdraw_memo);
        }
      }

      const asset = resolvePaymentAsset(tx, anchorEntry.assets);

      let publicKey: string;
      try {
        publicKey = await signer.getPublicKey();
      } catch (err) {
        throw new NairaRampError(
          "SIGNER_REJECTED",
          "Signer failed to provide public key",
          { cause: err }
        );
      }

      const horizonUrl =
        network === "mainnet"
          ? "https://horizon.stellar.org"
          : "https://horizon-testnet.stellar.org";
      const server = new Horizon.Server(horizonUrl);

      let baseFee = "1000";
      try {
        const feeStats = await server.feeStats();
        if (feeStats?.max_fee?.mode) {
          baseFee = String(feeStats.max_fee.mode);
        }
      } catch {
        baseFee = "1000";
      }

      let sourceAccount: Horizon.AccountResponse;
      try {
        sourceAccount = await server.loadAccount(publicKey);
      } catch (err) {
        throw new NairaRampError(
          "TRANSACTION_FAILED",
          `Failed to load account from Horizon: ${err instanceof Error ? err.message : String(err)}`,
          { cause: err }
        );
      }

      const builder = new TransactionBuilder(sourceAccount, {
        fee: baseFee,
        networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: tx.withdraw_anchor_account,
            asset,
            amount: tx.amount_in,
          })
        )
        .setTimeout(180);

      if (memo && memo.type !== "none") {
        builder.addMemo(memo);
      }

      const transaction = builder.build();

      let signedXdr: string;
      try {
        const xdr = transaction.toXDR();
        signedXdr = await signer.signTransaction(xdr, networkPassphrase);
      } catch (err) {
        throw new NairaRampError(
          "SIGNER_REJECTED",
          "Signer rejected withdrawal payment transaction",
          { cause: err }
        );
      }

      const signedTx = TransactionBuilder.fromXDR(
        signedXdr,
        networkPassphrase
      ) as Transaction;

      try {
        const res = await server.submitTransaction(signedTx);
        return { hash: res.hash };
      } catch (err) {
        const horizonErr = err as {
          response?: {
            data?: {
              extras?: {
                result_codes?: {
                  transaction?: string;
                  operations?: string[];
                };
              };
              detail?: string;
              title?: string;
            };
          };
          message?: string;
        };
        const responseData = horizonErr?.response?.data;
        const resultCodes = responseData?.extras?.result_codes;
        let detail = responseData?.detail || horizonErr?.message || String(err);
        if (resultCodes) {
          const txCode = resultCodes.transaction || "";
          const opCodes = Array.isArray(resultCodes.operations)
            ? resultCodes.operations.join(", ")
            : "";
          detail += ` (result_codes: transaction=${txCode}, operations=${opCodes})`;
        }
        throw new NairaRampError(
          "TRANSACTION_FAILED",
          `Horizon transaction submission failed: ${detail}`,
          { cause: err }
        );
      }
    },

    watch(id: string, handlers: WatchHandlers): WatchSubscription {
      return watchTransaction(ramp, id, handlers);
    },

    async getPrice(options: GetPriceOptions): Promise<Quote> {
      return fetchPrice(options, {
        anchor: anchorEntry,
        anchorClient,
        authenticate: async () => {
          const rawToken = await ramp.authenticate();
          return { token: rawToken } as Types.AuthToken;
        },
      });
    },
  };

  return ramp;
}
