import { AnchorEntry, AnchorEntrySchema } from "./schema.js";
import sdfTestAnchor from "./anchors/sdf-testanchor.json";

// Explicit array of static imports for browser compatibility (no fs)
// Anchor JSON files will be imported statically as they are registered.
const rawAnchors: unknown[] = [sdfTestAnchor];

export const anchors: AnchorEntry[] = rawAnchors.map((raw) =>
  AnchorEntrySchema.parse(raw)
);

const anchorMap = new Map<string, AnchorEntry>(
  anchors.map((anchor) => [anchor.id, anchor])
);

export function getAnchor(id: string): AnchorEntry {
  const anchor = anchorMap.get(id);
  if (!anchor) {
    throw new Error(`Anchor not found with id: ${id}`);
  }
  return anchor;
}

export interface ListAnchorsFilter {
  network?: "testnet" | "mainnet";
  country?: string;
}

export function listAnchors(filter?: ListAnchorsFilter): AnchorEntry[] {
  if (!filter) {
    return [...anchors];
  }
  return anchors.filter((anchor) => {
    if (filter.network && anchor.network !== filter.network) {
      return false;
    }
    if (filter.country && !anchor.countries.includes(filter.country)) {
      return false;
    }
    return true;
  });
}

export { AnchorEntrySchema, type AnchorEntry } from "./schema.js";

