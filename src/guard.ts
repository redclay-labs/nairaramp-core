import { NairaRampError } from "./errors.js";
import type { AnchorEntry } from "./registry/index.js";

export interface AssertNetworkAllowedOptions {
  network: "testnet" | "mainnet";
  anchor: AnchorEntry;
  allowMainnet?: boolean;
  now?: () => Date;
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export function assertNetworkAllowed({
  network,
  anchor,
  allowMainnet,
  now,
}: AssertNetworkAllowedOptions): void {
  if (network === "mainnet" && allowMainnet !== true) {
    throw new NairaRampError(
      "MAINNET_NOT_ALLOWED",
      "Mainnet operations are not allowed unless allowMainnet: true is explicitly specified"
    );
  }

  if (anchor.network !== network) {
    throw new NairaRampError(
      "ANCHOR_NOT_FOUND",
      `Anchor '${anchor.id}' is configured for ${anchor.network}, but requested network is ${network}`
    );
  }

  if (network === "mainnet") {
    const nowDate = now ? now() : new Date();
    const verifiedDate = new Date(anchor.verifiedAt);
    const verifiedTime = verifiedDate.getTime();

    if (isNaN(verifiedTime) || nowDate.getTime() - verifiedTime > NINETY_DAYS_MS) {
      throw new NairaRampError(
        "ANCHOR_NOT_VERIFIED",
        `Anchor '${anchor.id}' verifiedAt (${anchor.verifiedAt}) is older than 90 days`
      );
    }
  }
}

