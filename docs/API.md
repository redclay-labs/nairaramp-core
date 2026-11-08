# @nairaramp/core API Reference

This document describes the public API contract exported by `@nairaramp/core` (`src/index.ts`). Sibling packages such as `nairaramp-react` and `nairaramp-demo` build against these exact exports and signatures.

---

## Exports used by nairaramp-react

The following symbols exported by `@nairaramp/core` are consumed by `nairaramp-react`:
- `createRamp`
- `Ramp`
- `Signer`
- `TransactionStatus`
- `TERMINAL_STATUSES`
- `AnchorTransaction`
- `NairaRampError`
- `isNairaRampError`
- `NairaRampErrorCode`

---

## 1. Package Metadata

### `VERSION`
```typescript
const VERSION: string;
```
Current semver version string of the `@nairaramp/core` package.

```typescript
import { VERSION } from "@nairaramp/core";
console.log("NairaRamp SDK Version:", VERSION);
```

---

## 2. Core Ramp Client & Operations

### `createRamp(options: CreateRampOptions): Ramp`
Initializes a new `Ramp` instance configured for a specific anchor and network, using the supplied `Signer`. Calls `assertNetworkAllowed` immediately upon instantiation.

**Parameters:**
- `options.network`: `"testnet" | "mainnet"` - Stellar network target.
- `options.anchorId`: `string` - Registered anchor identifier (e.g., `"sdf-testanchor"`).
- `options.signer`: `Signer` - Signer instance implementing `getPublicKey` and `signTransaction`.
- `options.clientDomain?`: `string` - Optional client domain for SEP-10 authentication.
- `options.allowMainnet?`: `boolean` - Required `true` when `network === "mainnet"`.
- `options.now?`: `() => Date` - Optional clock override for verifying anchor freshness (defaults to system clock).

**Throws:**
- `ANCHOR_NOT_FOUND` - If `anchorId` is not registered in the registry or if anchor network does not match requested network.
- `MAINNET_NOT_ALLOWED` - If `network === "mainnet"` and `allowMainnet !== true`.
- `ANCHOR_NOT_VERIFIED` - If `network === "mainnet"` and anchor `verifiedAt` is older than 90 days.

**Example:**
```typescript
import { createRamp, keypairSigner } from "@nairaramp/core";

const ramp = createRamp({
  network: "testnet",
  anchorId: "sdf-testanchor",
  signer: keypairSigner("SD4WZX23G7Y7N5F2B5Q23J3S7A66GJJ244M37DGBM5X57Q4X5H62K22L"),
});
```

---

### `Ramp` (interface)
The primary client interface returned by `createRamp`.

```typescript
interface Ramp {
  readonly anchor: AnchorEntry;
  authenticate(): Promise<string>;
  deposit(options: DepositOptions): Promise<{ id: string; url: string }>;
  withdraw(options: WithdrawOptions): Promise<{ id: string; url: string }>;
  getTransaction(id: string): Promise<AnchorTransaction>;
  completeWithdrawal(id: string): Promise<{ hash: string }>;
  watch(id: string, handlers: WatchHandlers): WatchSubscription;
  getPrice(options: GetPriceOptions): Promise<Quote>;
}
```

#### `ramp.authenticate(): Promise<string>`
Executes SEP-10 authentication against the anchor's web auth server using the configured signer and returns a valid JWT string. Cached in memory until near expiration (5-minute safety buffer).

**Throws:**
- `SIGNER_REJECTED` - If user or signer denies challenge signing.
- `AUTH_FAILED` - If challenge verification or token issuance fails.
- `ANCHOR_UNREACHABLE` - If anchor web auth server cannot be contacted.

```typescript
const jwt = await ramp.authenticate();
console.log("SEP-10 JWT:", jwt);
```

#### `ramp.deposit(options: DepositOptions): Promise<{ id: string; url: string }>`
Initiates a SEP-24 hosted deposit flow. Validates asset code against registered anchor assets upfront before invoking network endpoints.

**Parameters:**
- `options.assetCode`: `string` - Asset code (e.g., `"SRT"`, `"NGNC"`).
- `options.amount?`: `string` - Optional initial deposit amount.

**Throws:**
- `UNSUPPORTED_ASSET` - If `assetCode` is not supported by the anchor.
- `AUTH_FAILED` - If authentication fails.
- `ANCHOR_UNREACHABLE` - If anchor SEP-24 server is unreachable.

```typescript
const { id, url } = await ramp.deposit({ assetCode: "SRT", amount: "100" });
console.log("Hosted deposit flow URL:", url);
```

#### `ramp.withdraw(options: WithdrawOptions): Promise<{ id: string; url: string }>`
Initiates a SEP-24 hosted withdrawal flow.

**Parameters:**
- `options.assetCode`: `string` - Asset code (e.g., `"SRT"`, `"NGNC"`).
- `options.amount?`: `string` - Optional withdrawal amount.

**Throws:**
- `UNSUPPORTED_ASSET` - If `assetCode` is not supported by the anchor.
- `AUTH_FAILED` - If authentication fails.
- `ANCHOR_UNREACHABLE` - If anchor SEP-24 server is unreachable.

```typescript
const { id, url } = await ramp.withdraw({ assetCode: "SRT", amount: "50" });
console.log("Hosted withdrawal flow URL:", url);
```

#### `ramp.getTransaction(id: string): Promise<AnchorTransaction>`
Fetches current status and metadata of a SEP-24 transaction by its unique identifier.

**Throws:**
- `AUTH_FAILED` - If authentication fails.
- `ANCHOR_UNREACHABLE` - If anchor endpoint cannot be reached.

```typescript
const tx = await ramp.getTransaction("sep24-transaction-id");
console.log("Transaction status:", tx.status);
```

#### `ramp.completeWithdrawal(id: string): Promise<{ hash: string }>`
Completes a pending withdrawal once status reaches `"pending_user_transfer_start"`. Fetches transaction details, builds and signs Stellar payment to `withdraw_anchor_account` with the required memo, submits to Horizon, and returns transaction hash.

**Throws:**
- `TRANSACTION_FAILED` - If transaction status is not `"pending_user_transfer_start"`, if payment fields are missing, or if Horizon submission fails.
- `SIGNER_REJECTED` - If signer denies signing the payment transaction.
- `ANCHOR_UNREACHABLE` - If Horizon or anchor is unreachable.

```typescript
const { hash } = await ramp.completeWithdrawal("sep24-transaction-id");
console.log("Payment transaction hash:", hash);
```

#### `ramp.watch(id: string, handlers: WatchHandlers): WatchSubscription`
Subscribes to transaction status changes with polling, exponential backoff, jitter, and automatic terminal status completion.

```typescript
const sub = ramp.watch("sep24-transaction-id", {
  onStatus: (status, tx) => console.log("Status:", status, tx.id),
  onComplete: (tx) => console.log("Completed:", tx.stellar_transaction_id),
  onError: (err) => console.error("Watcher error:", err.message),
});

// To cancel:
sub.stop();
```

#### `ramp.getPrice(options: GetPriceOptions): Promise<Quote>`
Fetches indicative pricing via SEP-38. Exactly one of `sellAmount` or `buyAmount` must be provided. Checks that anchor advertises `sep38` before making any network or auth call.

**Parameters:**
- `options.sellAsset`: `string` - SEP-38 formatted asset string (`"stellar:CODE:ISSUER"` or `"iso4217:NGN"`).
- `options.buyAsset`: `string` - SEP-38 formatted asset string.
- `options.sellAmount?`: `string` - Amount to sell.
- `options.buyAmount?`: `string` - Amount to buy.
- `options.context?`: `"sep6" | "sep24" | "sep31"` - Context (defaults to `"sep6"`).

**Throws:**
- `QUOTE_UNAVAILABLE` - If amount options are invalid, anchor lacks `sep38`, or anchor cannot provide a price.
- `AUTH_FAILED` - If authentication fails.
- `ANCHOR_UNREACHABLE` - If anchor endpoint is unreachable.

```typescript
const quote = await ramp.getPrice({
  sellAsset: "stellar:SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
  buyAsset: "iso4217:USD",
  sellAmount: "10",
});
console.log("Rate:", quote.price, "Buy amount:", quote.buyAmount);
```

---

## 3. Types for Core Ramp

### `CreateRampOptions`
```typescript
interface CreateRampOptions {
  network: "testnet" | "mainnet";
  anchorId: string;
  signer: Signer;
  clientDomain?: string;
  allowMainnet?: boolean;
  now?: () => Date;
}
```

### `DepositOptions`
```typescript
interface DepositOptions {
  assetCode: string;
  amount?: string;
}
```

### `WithdrawOptions`
```typescript
interface WithdrawOptions {
  assetCode: string;
  amount?: string;
}
```

### `AnchorTransaction`
```typescript
interface AnchorTransaction {
  id: string;
  status: TransactionStatus;
  amount_in?: string;
  amount_out?: string;
  withdraw_anchor_account?: string;
  withdraw_memo?: string;
  withdraw_memo_type?: string;
  stellar_transaction_id?: string;
  message?: string;
}
```

### `GetPriceOptions`
```typescript
interface GetPriceOptions {
  sellAsset: string;
  buyAsset: string;
  sellAmount?: string;
  buyAmount?: string;
  context?: "sep6" | "sep24" | "sep31";
}
```

### `Quote`
```typescript
interface Quote {
  sellAsset: string;
  buyAsset: string;
  sellAmount: string;
  buyAmount: string;
  price: string;
  totalFee: string;
  feeAsset: string;
}
```

---

## 4. Signers

All signers implement the common `Signer` interface:
```typescript
interface Signer {
  getPublicKey(): Promise<string>;
  signTransaction(xdr: string, options?: { networkPassphrase?: string }): Promise<string>;
}
```

### `keypairSigner(secretKey: string): Signer`
Creates an in-memory signer using a Stellar secret seed key (`S...`).

**Throws:**
- `NairaRampError("SIGNER_REJECTED")` - If secret key is invalid.

```typescript
import { keypairSigner } from "@nairaramp/core";
const signer = keypairSigner("SD4WZX23G7Y7N5F2B5Q23J3S7A66GJJ244M37DGBM5X57Q4X5H62K22L");
```

### `freighterSigner(): Signer`
Creates a signer backed by the Freighter browser extension API via `@stellar/freighter-api`.

**Throws:**
- `NairaRampError("SIGNER_REJECTED")` - If Freighter is not installed, user denies permission, or signature fails.

```typescript
import { freighterSigner } from "@nairaramp/core";
const signer = freighterSigner();
```

### `walletsKitSigner(kit: WalletsKitLike): Signer`
Wraps an initialized instance of `@creit.tech/stellar-wallets-kit`.

```typescript
import { walletsKitSigner } from "@nairaramp/core";
import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";

const kit = new StellarWalletsKit({ ... });
const signer = walletsKitSigner(kit);
```

---

## 5. Transaction Watcher

### `TERMINAL_STATUSES`
```typescript
const TERMINAL_STATUSES: readonly [
  "completed",
  "refunded",
  "expired",
  "no_market",
  "too_small",
  "too_large",
  "error"
];
```

### `TransactionStatus`
```typescript
type TransactionStatus =
  | "incomplete"
  | "pending_user_transfer_start"
  | "pending_user_transfer_complete"
  | "pending_external"
  | "pending_anchor"
  | "pending_stellar"
  | "pending_trust"
  | "pending_user"
  | "completed"
  | "refunded"
  | "expired"
  | "no_market"
  | "too_small"
  | "too_large"
  | "error";
```

### `TerminalStatus`
```typescript
type TerminalStatus = (typeof TERMINAL_STATUSES)[number];
```

### `WatchHandlers`
```typescript
interface WatchHandlers {
  onStatus?: (status: TransactionStatus | string, transaction: AnchorTransaction) => void;
  onComplete?: (transaction: AnchorTransaction) => void;
  onError?: (error: NairaRampError) => void;
}
```

### `WatchSubscription`
```typescript
interface WatchSubscription {
  stop: () => void;
}
```

### `WatchableRamp`
```typescript
interface WatchableRamp {
  getTransaction(id: string): Promise<AnchorTransaction>;
}
```

### `watchTransaction(ramp: WatchableRamp, id: string, handlers: WatchHandlers): WatchSubscription`
Standalone polling watcher function with exponential backoff and jitter.

---

## 6. Mainnet Safety Guard

### `assertNetworkAllowed(options: AssertNetworkAllowedOptions): void`
Verifies that the requested network and anchor meet safety requirements before any network activity occurs.

```typescript
function assertNetworkAllowed(options: {
  network: "testnet" | "mainnet";
  anchor: AnchorEntry;
  allowMainnet?: boolean;
  now?: () => Date;
}): void;
```

**Throws:**
- `MAINNET_NOT_ALLOWED` - When `network === "mainnet"` and `allowMainnet !== true`.
- `ANCHOR_NOT_FOUND` - When `anchor.network !== network`.
- `ANCHOR_NOT_VERIFIED` - When `network === "mainnet"` and `anchor.verifiedAt` is older than 90 days.

---

## 7. Anchor Registry

### `getAnchor(id: string): AnchorEntry`
Finds an anchor entry by its unique lowercase kebab-case id.

**Throws:**
- `ANCHOR_NOT_FOUND` - When anchor id is not registered.

```typescript
import { getAnchor } from "@nairaramp/core";
const anchor = getAnchor("sdf-testanchor");
console.log(anchor.name, anchor.homeDomain);
```

### `listAnchors(filter?: ListAnchorsFilter): AnchorEntry[]`
Returns list of registered anchors, optionally filtered by network (`"testnet"` or `"mainnet"`) or country code (ISO 3166-1 alpha-2).

```typescript
import { listAnchors } from "@nairaramp/core";
const testnetAnchors = listAnchors({ network: "testnet" });
```

### `AnchorEntrySchema` & `AnchorEntry`
Zod schema and inferred TypeScript type for anchor definitions.

```typescript
interface AnchorEntry {
  id: string;
  name: string;
  homeDomain: string;
  network: "testnet" | "mainnet";
  assets: Array<{ code: string; issuer: string }>;
  seps: Array<"sep6" | "sep10" | "sep12" | "sep24" | "sep38">;
  countries: string[];
  verifiedAt: string;
}
```

---

## 8. Errors

### `NairaRampError`
Base exception thrown by all public API functions in `@nairaramp/core`.

```typescript
class NairaRampError extends Error {
  readonly code: NairaRampErrorCode;
  readonly cause?: unknown;
  constructor(code: NairaRampErrorCode, message: string, options?: { cause?: unknown } | unknown);
}
```

### `isNairaRampError(e: unknown): e is NairaRampError`
Type-guard helper to detect `NairaRampError` instances safely across bundle boundaries.

```typescript
import { isNairaRampError } from "@nairaramp/core";

try {
  await ramp.deposit({ assetCode: "XYZ" });
} catch (err) {
  if (isNairaRampError(err)) {
    console.error("SDK Error Code:", err.code);
  }
}
```

### `NairaRampErrorCode`
Union type of all recognized error codes:
```typescript
type NairaRampErrorCode =
  | "AUTH_FAILED"
  | "ANCHOR_UNREACHABLE"
  | "ANCHOR_NOT_FOUND"
  | "KYC_REQUIRED"
  | "QUOTE_EXPIRED"
  | "QUOTE_UNAVAILABLE"
  | "UNSUPPORTED_ASSET"
  | "SIGNER_REJECTED"
  | "TRANSACTION_FAILED"
  | "MAINNET_NOT_ALLOWED"
  | "ANCHOR_NOT_VERIFIED";
```
