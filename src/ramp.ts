import {
  Networks,
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

export interface CreateRampOptions {
  network: "testnet" | "mainnet";
  anchorId: string;
  signer: Signer;
}

export interface Ramp {
  authenticate(): Promise<string>;
  deposit(options: DepositOptions): Promise<{ id: string; url: string }>;
  getTransaction(id: string): Promise<AnchorTransaction>;
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
}: CreateRampOptions): Ramp {
  const anchorEntry = getAnchor(anchorId);

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
  };

  return ramp;
}
