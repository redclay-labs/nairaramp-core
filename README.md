# @nairaramp/core

A TypeScript SDK that adds Pay with Naira and Cash Out to Naira flows to Stellar applications through Stellar anchors.

## Notice

> **Testnet Only:** Mainnet access is disabled by default. Mainnet anchor interactions require explicit opt-in (`allowMainnet: true`) and pass automatic safety verification freshness checks.

## Installation

```bash
pnpm add @nairaramp/core
```

## Quick Example

```typescript
import { createRamp, keypairSigner } from "@nairaramp/core";

const ramp = createRamp({
  network: "testnet",
  anchorId: "sdf-testanchor",
  signer: keypairSigner("SD4WZX23G7Y7N5F2B5Q23J3S7A66GJJ244M37DGBM5X57Q4X5H62K22L"),
});

const { id, url } = await ramp.deposit({ assetCode: "SRT" });
console.log("Hosted deposit flow URL:", url);

const sub = ramp.watch(id, {
  onStatus: (status) => console.log("Status:", status),
  onComplete: (tx) => console.log("Deposit completed:", tx.stellar_transaction_id),
});
```

## Documentation

- [API Reference](docs/API.md)
- [Nigerian Stellar Anchors Research](docs/anchors-nigeria.md)
- [Contributing Guidelines](CONTRIBUTING.md)

Related repositories: nairaramp-react, nairaramp-demo
