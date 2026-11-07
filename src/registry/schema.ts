import { z } from "zod";
import { StrKey } from "@stellar/stellar-sdk";

export const AnchorEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be lowercase kebab-case"),
  name: z.string().min(1, "name must be a non-empty string"),
  homeDomain: z
    .string()
    .min(1, "homeDomain must be non-empty")
    .refine(
      (val) => !val.includes("://") && !val.includes("/") && /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/.test(val),
      { message: "homeDomain must be a hostname with no protocol or path" }
    ),
  network: z.enum(["testnet", "mainnet"]),
  assets: z
    .array(
      z.object({
        code: z.string().regex(/^[a-zA-Z0-9]{1,12}$/, "code must be 1-12 alphanumeric characters"),
        issuer: z.string().refine((val) => StrKey.isValidEd25519PublicKey(val), {
          message: "issuer must be a valid Stellar Ed25519 public key",
        }),
      })
    )
    .min(1, "assets must be a non-empty array"),
  seps: z.array(z.enum(["sep6", "sep10", "sep12", "sep24", "sep38"])),
  countries: z.array(
    z.string().regex(/^[A-Z]{2}$/, "countries must be ISO 3166-1 alpha-2 two-letter uppercase codes")
  ),
  verifiedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "verifiedAt must be in YYYY-MM-DD format")
    .refine(
      (val) => {
        const parts = val.split("-").map(Number);
        const [year, month, day] = parts;
        if (!year || !month || !day) return false;
        const d = new Date(Date.UTC(year, month - 1, day));
        return (
          d.getUTCFullYear() === year &&
          d.getUTCMonth() === month - 1 &&
          d.getUTCDate() === day
        );
      },
      { message: "verifiedAt must be a real calendar date" }
    ),
});

export type AnchorEntry = z.infer<typeof AnchorEntrySchema>;
