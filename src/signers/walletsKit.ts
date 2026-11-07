import { isNairaRampError, NairaRampError } from "../errors.js";
import type { Signer } from "./types.js";

export interface WalletsKitLike {
  getAddress?: () => Promise<{ address: string; error?: unknown } | string>;
  address?: () => Promise<{ address: string; error?: unknown } | string>;
  getPublicKey?: () => Promise<string>;
  signTransaction: (
    xdr: string,
    opts?: {
      networkPassphrase?: string;
      address?: string;
      path?: string;
    }
  ) => Promise<
    | {
        signedTxXdr?: string;
        signedXDR?: string;
        signerAddress?: string;
        error?: unknown;
      }
    | string
  >;
}

async function extractAddress(kit: WalletsKitLike): Promise<string> {
  const getFn =
    typeof kit.getAddress === "function"
      ? kit.getAddress
      : typeof kit.address === "function"
        ? kit.address
        : kit.getPublicKey;

  if (typeof getFn !== "function") {
    throw new Error("Kit does not have an address or getAddress method");
  }

  const res = await getFn.call(kit);
  if (res && typeof res === "object" && "error" in res && res.error) {
    throw new Error(
      typeof res.error === "string" ? res.error : JSON.stringify(res.error)
    );
  }

  const addr =
    typeof res === "string"
      ? res
      : res && typeof res === "object" && "address" in res
        ? res.address
        : null;

  if (!addr || typeof addr !== "string") {
    throw new Error("Kit did not return a valid address");
  }

  return addr;
}

export function walletsKitSigner(kit: WalletsKitLike): Signer {
  return {
    async getPublicKey(): Promise<string> {
      try {
        return await extractAddress(kit);
      } catch (err) {
        if (isNairaRampError(err)) throw err;
        throw new NairaRampError(
          "SIGNER_REJECTED",
          err instanceof Error ? err.message : String(err),
          { cause: err }
        );
      }
    },

    async signTransaction(
      xdr: string,
      networkPassphrase: string
    ): Promise<string> {
      try {
        const address = await extractAddress(kit);
        if (typeof kit.signTransaction !== "function") {
          throw new Error("Kit does not have a signTransaction method");
        }

        const res = await kit.signTransaction(xdr, {
          networkPassphrase,
          address,
        });

        if (res && typeof res === "object" && "error" in res && res.error) {
          throw new Error(
            typeof res.error === "string"
              ? res.error
              : JSON.stringify(res.error)
          );
        }

        const signedXdr =
          typeof res === "string"
            ? res
            : res && typeof res === "object"
              ? ("signedTxXdr" in res && typeof res.signedTxXdr === "string"
                  ? res.signedTxXdr
                  : "signedXDR" in res && typeof res.signedXDR === "string"
                    ? res.signedXDR
                    : null)
              : null;

        if (!signedXdr || typeof signedXdr !== "string") {
          throw new Error("Kit did not return signed transaction XDR");
        }

        return signedXdr;
      } catch (err) {
        if (isNairaRampError(err)) throw err;
        throw new NairaRampError(
          "SIGNER_REJECTED",
          err instanceof Error ? err.message : String(err),
          { cause: err }
        );
      }
    },
  };
}

