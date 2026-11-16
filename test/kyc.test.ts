import { describe, it, expect, vi } from "vitest";
import type { Anchor, Types } from "@stellar/typescript-wallet-sdk";
import { fetchKycStatus, submitKyc } from "../src/kyc.js";
import { NairaRampError } from "../src/errors.js";
import { getAnchor } from "../src/registry/index.js";

const cowrieAnchor = getAnchor("cowrie");
const ngncAnchor = getAnchor("ngnc");

function makeContext(sep12Mock: Record<string, unknown>, anchor = cowrieAnchor) {
  const anchorClient = {
    sep12: vi.fn().mockResolvedValue(sep12Mock),
  } as unknown as Anchor;
  const authenticate = vi
    .fn()
    .mockResolvedValue({ token: "jwt-token" } as unknown as Types.AuthToken);
  return { anchor, anchorClient, authenticate };
}

describe("SEP-12 KYC (fetchKycStatus & submitKyc)", () => {
  describe("fetchKycStatus", () => {
    it("throws ANCHOR_UNREACHABLE if anchor does not support sep12", async () => {
      const ctx = makeContext({}, ngncAnchor);
      await expect(fetchKycStatus({}, ctx)).rejects.toMatchObject({
        name: "NairaRampError",
        code: "ANCHOR_UNREACHABLE",
      });
    });

    it("returns normalized customer KYC status and fields", async () => {
      const getCustomer = vi.fn().mockResolvedValue({
        id: "cust-123",
        status: "NEEDS_INFO",
        fields: {
          first_name: { type: "string", description: "First name" },
          bank_account_number: {
            type: "string",
            description: "NUBAN",
            optional: false,
          },
        },
        provided_fields: {
          email_address: {
            type: "string",
            description: "Email",
            status: "ACCEPTED",
          },
        },
        message: "Please provide bank account details",
      });

      const ctx = makeContext({ getCustomer });
      const result = await fetchKycStatus({ type: "sep6-deposit" }, ctx);

      expect(ctx.authenticate).toHaveBeenCalledTimes(1);
      expect(getCustomer).toHaveBeenCalledWith({
        id: undefined,
        type: "sep6-deposit",
        memo: undefined,
        lang: undefined,
        transactionId: undefined,
      });
      expect(result).toEqual({
        id: "cust-123",
        status: "NEEDS_INFO",
        fields: {
          first_name: { type: "string", description: "First name" },
          bank_account_number: {
            type: "string",
            description: "NUBAN",
            optional: false,
          },
        },
        providedFields: {
          email_address: {
            type: "string",
            description: "Email",
            status: "ACCEPTED",
          },
        },
        message: "Please provide bank account details",
      });
    });

    it("maps CustomerNotFoundError / 404 to KYC_REQUIRED", async () => {
      const notFoundErr = Object.assign(new Error("Customer not found"), {
        name: "CustomerNotFoundError",
      });
      const ctx = makeContext({
        getCustomer: vi.fn().mockRejectedValue(notFoundErr),
      });

      await expect(fetchKycStatus({ id: "missing" }, ctx)).rejects.toMatchObject(
        {
          name: "NairaRampError",
          code: "KYC_REQUIRED",
        }
      );
    });

    it("maps 401/403 responses to AUTH_FAILED", async () => {
      const authErr = Object.assign(new Error("Unauthorized"), {
        response: { status: 401 },
      });
      const ctx = makeContext({
        getCustomer: vi.fn().mockRejectedValue(authErr),
      });

      await expect(fetchKycStatus({}, ctx)).rejects.toMatchObject({
        name: "NairaRampError",
        code: "AUTH_FAILED",
      });
    });

    it("maps unexpected anchor failures to ANCHOR_UNREACHABLE", async () => {
      const ctx = makeContext({
        getCustomer: vi.fn().mockRejectedValue(new Error("502 Bad Gateway")),
      });

      await expect(fetchKycStatus({}, ctx)).rejects.toMatchObject({
        name: "NairaRampError",
        code: "ANCHOR_UNREACHABLE",
      });
    });
  });

  describe("submitKyc", () => {
    it("throws ANCHOR_UNREACHABLE if anchor does not support sep12", async () => {
      const ctx = makeContext({}, ngncAnchor);
      await expect(
        submitKyc({ fields: { first_name: "Ada" } }, ctx)
      ).rejects.toMatchObject({
        name: "NairaRampError",
        code: "ANCHOR_UNREACHABLE",
      });
    });

    it("throws KYC_REQUIRED when no fields or binaryFields are provided", async () => {
      const ctx = makeContext({});
      await expect(submitKyc({}, ctx)).rejects.toMatchObject({
        name: "NairaRampError",
        code: "KYC_REQUIRED",
      });
      expect(ctx.authenticate).not.toHaveBeenCalled();
    });

    it("calls sep12.add when id is omitted", async () => {
      const add = vi.fn().mockResolvedValue({ id: "cust-new-1" });
      const update = vi.fn();
      const ctx = makeContext({ add, update });

      const res = await submitKyc(
        {
          type: "sep6-deposit",
          fields: { first_name: "Ada", last_name: "Lovelace" },
        },
        ctx
      );

      expect(res).toEqual({ id: "cust-new-1" });
      expect(add).toHaveBeenCalledWith({
        sep9Info: { first_name: "Ada", last_name: "Lovelace" },
        sep9BinaryInfo: undefined,
        type: "sep6-deposit",
        memo: undefined,
        transactionId: undefined,
      });
      expect(update).not.toHaveBeenCalled();
    });

    it("calls sep12.update when id is provided and forwards binaryFields", async () => {
      const add = vi.fn();
      const update = vi.fn().mockResolvedValue({ id: "cust-123" });
      const ctx = makeContext({ add, update });
      const photo = new Uint8Array([1, 2, 3, 4]);

      const res = await submitKyc(
        {
          id: "cust-123",
          binaryFields: { photo_id_front: photo },
        },
        ctx
      );

      expect(res).toEqual({ id: "cust-123" });
      expect(update).toHaveBeenCalledWith({
        id: "cust-123",
        sep9Info: undefined,
        sep9BinaryInfo: { photo_id_front: photo },
        type: undefined,
        memo: undefined,
        transactionId: undefined,
      });
      expect(add).not.toHaveBeenCalled();
    });

    it("maps 400 validation errors to KYC_REQUIRED and 403 to AUTH_FAILED", async () => {
      const badRequest = Object.assign(new Error("Invalid BVN"), {
        response: { status: 400 },
      });
      const ctx400 = makeContext({
        add: vi.fn().mockRejectedValue(badRequest),
      });

      await expect(
        submitKyc({ fields: { id_number: "bad" } }, ctx400)
      ).rejects.toBeInstanceOf(NairaRampError);

      await expect(
        submitKyc({ fields: { id_number: "bad" } }, ctx400)
      ).rejects.toMatchObject({ code: "KYC_REQUIRED" });

      const forbidden = Object.assign(new Error("Forbidden"), {
        status: 403,
      });
      const ctx403 = makeContext({
        add: vi.fn().mockRejectedValue(forbidden),
      });

      await expect(
        submitKyc({ fields: { first_name: "Ada" } }, ctx403)
      ).rejects.toMatchObject({ code: "AUTH_FAILED" });
    });
  });
});
