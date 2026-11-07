import { describe, it, expect } from "vitest";
import {
  Keypair,
  TransactionBuilder,
  Networks,
  Account,
  Operation,
  Asset,
} from "@stellar/stellar-sdk";
import { keypairSigner } from "../../src/index.js";

describe("keypairSigner", () => {
  it("returns public key corresponding to secret", async () => {
    const kp = Keypair.random();
    const signer = keypairSigner(kp.secret());
    const pubKey = await signer.getPublicKey();
    expect(pubKey).toBe(kp.publicKey());
  });

  it("signs a transaction and appends valid signature", async () => {
    const kp = Keypair.random();
    const signer = keypairSigner(kp.secret());

    const account = new Account(kp.publicKey(), "100");
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: Keypair.random().publicKey(),
          asset: Asset.native(),
          amount: "10",
        })
      )
      .setTimeout(30)
      .build();

    const unsignedXdr = tx.toXDR();
    const signedXdr = await signer.signTransaction(
      unsignedXdr,
      Networks.TESTNET
    );

    const parsedTx = TransactionBuilder.fromXDR(signedXdr, Networks.TESTNET);
    expect(parsedTx.signatures.length).toBe(1);
    expect(parsedTx.signatures[0]?.signature.value.length).toBe(64);
  });
});
