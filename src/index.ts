export const VERSION = "0.2.0";
export {
  getAnchor,
  listAnchors,
  AnchorEntrySchema,
  type AnchorEntry,
  type ListAnchorsFilter,
} from "./registry/index.js";
export {
  NairaRampError,
  isNairaRampError,
  type NairaRampErrorCode,
  type NairaRampErrorOptions,
} from "./errors.js";
export {
  createRamp,
  type Ramp,
  type CreateRampOptions,
  type DepositOptions,
  type WithdrawOptions,
  type AnchorTransaction,
  type GetTransactionsOptions,
  type AnchorInfo,
  type GetPriceOptions,
  type Quote,
  type RequestQuoteOptions,
  type FirmQuote,
  type KycStatus,
  type KycField,
  type KycProvidedField,
  type KycStatusOptions,
  type KycStatusResult,
  type PutKycOptions,
  type PutKycResult,
  type Sep6DepositOptions,
  type Sep6DepositResult,
  type Sep6WithdrawOptions,
  type Sep6WithdrawResult,
} from "./ramp.js";
export { type Signer } from "./signers/types.js";
export { keypairSigner } from "./signers/keypair.js";
export { freighterSigner } from "./signers/freighter.js";
export {
  walletsKitSigner,
  type WalletsKitLike,
} from "./signers/walletsKit.js";
export {
  TERMINAL_STATUSES,
  type TransactionStatus,
  type TerminalStatus,
  type WatchHandlers,
  type WatchOptions,
  type WatchSubscription,
  type WatchableRamp,
  watchTransaction,
} from "./watcher.js";
export {
  assertNetworkAllowed,
  type AssertNetworkAllowedOptions,
} from "./guard.js";
