import {
  Networks,
  Transaction,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  PublicKeypair,
  Wallet,
  type WalletSigner,
} from "@stellar/typescript-wallet-sdk";
import { getAnchor } from "./registry/index.js";
import { isNairaRampError, NairaRampError } from "./errors.js";
import type { Signer } from "./signers/types.js";

export interface CreateRampOptions {
  network: "testnet" | "mainnet";
  anchorId: string;
  signer: Signer;
}

export interface Ramp {
  authenticate(): Promise<string>;
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

  return {
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

      const walletSigner: WalletSigner = {
        // @ts-expect-error WalletSigner signWithClientAccount allows returning Promise<Transaction>
        signWithClientAccount: async ({ transaction }) => {
          try {
            const xdr = transaction.toXDR();
            const signedXdr = await signer.signTransaction(
              xdr,
              networkPassphrase
            );
            const signedTx = TransactionBuilder.fromXDR(
              signedXdr,
              networkPassphrase
            ) as Transaction;
            transaction.signatures.push(...signedTx.signatures);
            return signedTx;
          } catch (err) {
            signerError = err;
            throw err;
          }
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
          errMsg.includes("403")
        ) {
          throw new NairaRampError(
            "AUTH_FAILED",
            `Authentication failed: ${errMsg}`,
            { cause: err }
          );
        }

        throw new NairaRampError(
          "ANCHOR_UNREACHABLE",
          `Failed to communicate with anchor at ${anchorEntry.homeDomain}: ${errMsg}`,
          { cause: err }
        );
      }
    },
  };
}
