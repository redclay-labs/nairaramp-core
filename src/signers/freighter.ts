import { isNairaRampError, NairaRampError } from "../errors.js";
import type { Signer } from "./types.js";

interface FreighterApiModule {
  getAddress?: () => Promise<{ address: string; error?: unknown }>;
  address?: () => Promise<{ address: string; error?: unknown }>;
  signTransaction?: (
    transactionXdr: string,
    opts?: { networkPassphrase?: string; address?: string }
  ) => Promise<{ signedTxXdr?: string; signerAddress?: string; error?: unknown }>;
  default?: {
    getAddress?: () => Promise<{ address: string; error?: unknown }>;
    address?: () => Promise<{ address: string; error?: unknown }>;
    signTransaction?: (
      transactionXdr: string,
      opts?: { networkPassphrase?: string; address?: string }
    ) => Promise<{ signedTxXdr?: string; signerAddress?: string; error?: unknown }>;
  };
}

export function freighterSigner(): Signer {
  async function loadFreighter(): Promise<FreighterApiModule> {
    try {
      const mod = await import("@stellar/freighter-api");
      return mod as unknown as FreighterApiModule;
    } catch (err) {
      throw new NairaRampError(
        "SIGNER_REJECTED",
        err instanceof Error ? err.message : String(err),
        { cause: err }
      );
    }
  }

  return {
    async getPublicKey(): Promise<string> {
      try {
        const freighter = await loadFreighter();
        const getAddressFn =
          freighter.getAddress ??
          freighter.default?.getAddress ??
          freighter.address ??
          freighter.default?.address;

        if (typeof getAddressFn !== "function") {
          throw new Error("Freighter getAddress function is not available");
        }

        const res = await getAddressFn();
        if (res && typeof res === "object" && "error" in res && res.error) {
          throw new Error(
            typeof res.error === "string"
              ? res.error
              : JSON.stringify(res.error)
          );
        }

        const address =
          typeof res === "string"
            ? res
            : res && typeof res === "object" && "address" in res
              ? res.address
              : null;

        if (!address || typeof address !== "string") {
          throw new Error("Freighter did not return a valid address");
        }

        return address;
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
        const freighter = await loadFreighter();
        const signTransactionFn =
          freighter.signTransaction ?? freighter.default?.signTransaction;

        if (typeof signTransactionFn !== "function") {
          throw new Error("Freighter signTransaction function is not available");
        }

        const res = await signTransactionFn(xdr, {
          networkPassphrase,
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
            : res && typeof res === "object" && "signedTxXdr" in res
              ? res.signedTxXdr
              : null;

        if (!signedXdr || typeof signedXdr !== "string") {
          throw new Error("Freighter did not return signed transaction XDR");
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

