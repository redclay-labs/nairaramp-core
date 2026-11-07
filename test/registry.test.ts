import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AnchorEntrySchema,
  getAnchor,
  listAnchors,
  NairaRampError,
  isNairaRampError,
} from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const validFixture = JSON.parse(
  readFileSync(resolve(__dirname, "fixtures/valid-anchor.json"), "utf8")
);

describe("Anchor Registry Schema", () => {
  it("a valid fixture in test/fixtures/ passes", () => {
    const result = AnchorEntrySchema.safeParse(validFixture);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("test-anchor");
    }
  });

  it("fails on bad issuer with a message naming the field", () => {
    const badIssuer = {
      ...validFixture,
      assets: [{ code: "NGN", issuer: "NOT_A_VALID_KEY" }],
    };
    const result = AnchorEntrySchema.safeParse(badIssuer);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issuePaths = result.error.issues.map((i) => i.path.join("."));
      const messages = result.error.issues.map((i) => i.message).join(" ");
      const matchesField =
        issuePaths.some((p) => p.includes("issuer")) ||
        messages.toLowerCase().includes("issuer");
      expect(matchesField).toBe(true);
    }
  });

  it("fails on missing field with a message naming the field", () => {
    const missingField = { ...validFixture };
    delete (missingField as Record<string, unknown>).name;
    const result = AnchorEntrySchema.safeParse(missingField);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issuePaths = result.error.issues.map((i) => i.path.join("."));
      expect(issuePaths).toContain("name");
    }
  });

  it("fails on bad date with a message naming the field", () => {
    const badDate = {
      ...validFixture,
      verifiedAt: "2026-02-31", // invalid calendar date
    };
    const result = AnchorEntrySchema.safeParse(badDate);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issuePaths = result.error.issues.map((i) => i.path.join("."));
      expect(issuePaths).toContain("verifiedAt");
    }
  });

  it("fails on bad id with a message naming the field", () => {
    const badId = {
      ...validFixture,
      id: "Bad_Anchor_Id!",
    };
    const result = AnchorEntrySchema.safeParse(badId);
    expect(result.success).toBe(false);
    if (!result.success) {
      const issuePaths = result.error.issues.map((i) => i.path.join("."));
      expect(issuePaths).toContain("id");
    }
  });

  it("reads every src/registry/anchors/*.json with fs and validates it", () => {
    const anchorsDir = resolve(__dirname, "../src/registry/anchors");
    const files = readdirSync(anchorsDir).filter((file) => file.endsWith(".json"));

    for (const file of files) {
      const content = JSON.parse(readFileSync(resolve(anchorsDir, file), "utf8"));
      const parsed = AnchorEntrySchema.safeParse(content);
      expect(parsed.success, `File ${file} failed schema validation`).toBe(true);
    }
  });
});

describe("Anchor Registry Functions", () => {
  it("getAnchor throws NairaRampError for unknown id", () => {
    expect(() => getAnchor("non-existent-id")).toThrow(NairaRampError);
    expect(() => getAnchor("non-existent-id")).toThrow("Unknown anchor id: non-existent-id");
    try {
      getAnchor("non-existent-id");
    } catch (e) {
      expect(isNairaRampError(e)).toBe(true);
      if (isNairaRampError(e)) {
        expect(e.code).toBe("ANCHOR_NOT_FOUND");
        expect(e.message).toBe("Unknown anchor id: non-existent-id");
      }
    }
  });

  it("getAnchor returns registered sdf-testanchor", () => {
    const anchor = getAnchor("sdf-testanchor");
    expect(anchor.id).toBe("sdf-testanchor");
    expect(anchor.homeDomain).toBe("testanchor.stellar.org");
    expect(anchor.network).toBe("testnet");
    expect(anchor.seps).toContain("sep24");
  });

  it("listAnchors returns array", () => {
    const all = listAnchors();
    expect(Array.isArray(all)).toBe(true);
  });
});
