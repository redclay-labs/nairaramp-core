export const VERSION = "0.0.0";
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
  type AnchorTransaction,
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
  type WatchSubscription,
  type WatchableRamp,
  watchTransaction,
} from "./watcher.js";
