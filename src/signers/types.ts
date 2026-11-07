export interface Signer {
  getPublicKey(): Promise<string>;
  signTransaction(xdr: string, networkPassphrase: string): Promise<string>;
}
