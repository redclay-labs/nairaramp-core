import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import type { Signer } from "./types.js";

export function keypairSigner(secretKey: string): Signer {
  const kp = Keypair.fromSecret(secretKey);
  return {
    async getPublicKey(): Promise<string> {
      return kp.publicKey();
    },
    async signTransaction(xdr: string, networkPassphrase: string): Promise<string> {
      const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase);
      tx.sign(kp);
      return tx.toXDR();
    },
  };
}
