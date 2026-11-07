import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

export async function createFundedTestAccount(): Promise<string> {
  const keypair = Keypair.random();
  const url = `https://friendbot.stellar.org?addr=${keypair.publicKey()}`;

  async function tryFund(): Promise<boolean> {
    try {
      const res = await fetch(url);
      return res.ok;
    } catch {
      return false;
    }
  }

  let success = await tryFund();
  if (!success) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    success = await tryFund();
    if (!success) {
      throw new Error(`Failed to fund test account with Friendbot at ${url}`);
    }
  }

  return keypair.secret();
}

export async function addTrustline(
  secret: string,
  assetCode: string,
  issuer: string
): Promise<void> {
  const keypair = Keypair.fromSecret(secret);
  const server = new Horizon.Server("https://horizon-testnet.stellar.org");
  const account = await server.loadAccount(keypair.publicKey());
  const fee = await server.fetchBaseFee();

  const tx = new TransactionBuilder(account, {
    fee: fee.toString(),
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(assetCode, issuer),
      })
    )
    .setTimeout(30)
    .build();

  tx.sign(keypair);
  await server.submitTransaction(tx);
}

