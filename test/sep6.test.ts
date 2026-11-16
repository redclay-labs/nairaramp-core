import { describe, it, expect, vi } from "vitest";
import type { Anchor, Types } from "@stellar/typescript-wallet-sdk";
import { performSep6Deposit, performSep6Withdraw } from "../src/sep6.js";
import { getAnchor } from "../src/registry/index.js";

const cowrieAnchor = getAnchor("cowrie");
const ngncAnchor = getAnchor("ngnc");
const TEST_ACCOUNT = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

function makeContext(sep6Mock: Record<string, unknown>, anchor = cowrieAnchor) {
  const anchorClient = {
    sep6: vi.fn().mockReturnValue(sep6Mock),
  } as unknown as Anchor;
  const authenticate = vi
    .fn()
    .mockResolvedValue({ token: "jwt-token" } as unknown as Types.AuthToken);
  return {
    anchor,
    anchorClient,
    account: TEST_ACCOUNT,
    authenticate,
  };
}

describe("SEP-6 Transfers (performSep6Deposit & performSep6Withdraw)", () => {
  describe("performSep6Deposit", () => {
    it("throws ANCHOR_UNREACHABLE if anchor does not advertise sep6", async () => {
      const ctx = makeContext({}, ngncAnchor);
      await expect(
        performSep6Deposit({ assetCode: "NGNC" }, ctx)
      ).rejects.toMatchObject({
        name: "NairaRampError",
        code: "ANCHOR_UNREACHABLE",
      });
    });

    it("throws UNSUPPORTED_ASSET if assetCode is not in anchor registry", async () => {
      const ctx = makeContext({});
      await expect(
        performSep6Deposit({ assetCode: "USDC" }, ctx)
      ).rejects.toMatchObject({
        name: "NairaRampError",
        code: "UNSUPPORTED_ASSET",
      });
    });

    it("submits deposit with default signer account and normalizes instructions", async () => {
      const deposit = vi.fn().mockResolvedValue({
        id: "sep6-dep-1",
        how: "Transfer NGN to bank account below",
        instructions: {
          bank_account: { value: "0123456789", description: "Account number" },
        },
        eta: 300,
        min_amoun: 1000,
        max_amount: 5000000,
        fee_fixed: 50,
        fee_percent: 0.5,
        extra_info: { message: "Use reference NGNT-1" },
      });
      const ctx = makeContext({ deposit });

      const result = await performSep6Deposit(
        { assetCode: "NGNT", amount: "25000", customerId: "cust-1" },
        ctx
      );

      expect(deposit).toHaveBeenCalledWith({
        authToken: { token: "jwt-token" },
        params: {
          asset_code: "NGNT",
          account: TEST_ACCOUNT,
          amount: "25000",
          customer_id: "cust-1",
        },
      });
      expect(result).toEqual({
        id: "sep6-dep-1",
        how: "Transfer NGN to bank account below",
        instructions: {
          bank_account: { value: "0123456789", description: "Account number" },
        },
        eta: 300,
        minAmount: 1000,
        maxAmount: 5000000,
        feeFixed: 50,
        feePercent: 0.5,
        extraInfo: { message: "Use reference NGNT-1" },
      });
    });

    it("returns status and moreInfoUrl when anchor returns Sep6Pending", async () => {
      const deposit = vi.fn().mockResolvedValue({
        type: "customer_info_status",
        status: "pending",
        more_info_url: "https://cowrie.exchange/kyc/status",
        eta: 600,
      });
      const ctx = makeContext({ deposit });

      const result = await performSep6Deposit({ assetCode: "NGNT" }, ctx);
      expect(result).toEqual({
        status: "pending",
        moreInfoUrl: "https://cowrie.exchange/kyc/status",
        eta: 600,
      });
    });

    it("throws KYC_REQUIRED when Sep6MissingKYC response is returned", async () => {
      const deposit = vi.fn().mockResolvedValue({
        type: "non_interactive_customer_info_needed",
        fields: ["first_name", "last_name"],
      });
      const ctx = makeContext({ deposit });

      await expect(
        performSep6Deposit({ assetCode: "NGNT" }, ctx)
      ).rejects.toMatchObject({
        name: "NairaRampError",
        code: "KYC_REQUIRED",
      });
    });

    it("maps 403 customer_info_needed error to KYC_REQUIRED", async () => {
      const err = Object.assign(new Error("customer_info_needed"), {
        response: {
          status: 403,
          data: {
            type: "non_interactive_customer_info_needed",
            fields: ["email_address"],
          },
        },
      });
      const ctx = makeContext({ deposit: vi.fn().mockRejectedValue(err) });

      await expect(
        performSep6Deposit({ assetCode: "NGNT" }, ctx)
      ).rejects.toMatchObject({
        name: "NairaRampError",
        code: "KYC_REQUIRED",
      });
    });
  });

  describe("performSep6Withdraw", () => {
    it("throws ANCHOR_UNREACHABLE if anchor does not advertise sep6", async () => {
      const ctx = makeContext({}, ngncAnchor);
      await expect(
        performSep6Withdraw({ assetCode: "NGNC", type: "bank_account" }, ctx)
      ).rejects.toMatchObject({
        name: "NairaRampError",
        code: "ANCHOR_UNREACHABLE",
      });
    });

    it("throws UNSUPPORTED_ASSET if assetCode is not in anchor registry", async () => {
      const ctx = makeContext({});
      await expect(
        performSep6Withdraw({ assetCode: "EURT", type: "bank_account" }, ctx)
      ).rejects.toMatchObject({
        name: "NairaRampError",
        code: "UNSUPPORTED_ASSET",
      });
    });

    it("submits withdraw and normalizes accountId and memo fields", async () => {
      const withdraw = vi.fn().mockResolvedValue({
        id: "sep6-wd-1",
        account_id: "GCOWRIE...ANCHOR",
        memo_type: "text",
        memo: "wd-ref-1",
        eta: 180,
        min_amount: 500,
        max_amount: 1000000,
        fee_fixed: 25,
        fee_percent: 0.25,
      });
      const ctx = makeContext({ withdraw });

      const result = await performSep6Withdraw(
        {
          assetCode: "NGNT",
          type: "bank_account",
          dest: "0123456789",
          destExtra: "058",
          amount: "10000",
        },
        ctx
      );

      expect(withdraw).toHaveBeenCalledWith({
        authToken: { token: "jwt-token" },
        params: {
          asset_code: "NGNT",
          type: "bank_account",
          dest: "0123456789",
          dest_extra: "058",
          account: TEST_ACCOUNT,
          amount: "10000",
        },
      });
      expect(result).toEqual({
        id: "sep6-wd-1",
        accountId: "GCOWRIE...ANCHOR",
        memoType: "text",
        memo: "wd-ref-1",
        eta: 180,
        minAmount: 500,
        maxAmount: 1000000,
        feeFixed: 25,
        feePercent: 0.25,
      });
    });

    it("maps 401 responses to AUTH_FAILED and other errors to ANCHOR_UNREACHABLE", async () => {
      const authErr = Object.assign(new Error("Unauthorized"), {
        response: { status: 401 },
      });
      const ctxAuth = makeContext({
        withdraw: vi.fn().mockRejectedValue(authErr),
      });

      await expect(
        performSep6Withdraw({ assetCode: "NGNT", type: "bank_account" }, ctxAuth)
      ).rejects.toMatchObject({ code: "AUTH_FAILED" });

      const ctxNet = makeContext({
        withdraw: vi.fn().mockRejectedValue(new Error("ECONNRESET")),
      });

      await expect(
        performSep6Withdraw({ assetCode: "NGNT", type: "bank_account" }, ctxNet)
      ).rejects.toMatchObject({ code: "ANCHOR_UNREACHABLE" });
    });
  });
});

