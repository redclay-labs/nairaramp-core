import { describe, it, expect } from "vitest";
import {
  createRamp,
  getAnchor,
  keypairSigner,
  type AnchorTransaction,
} from "../../src/index.js";
import { addTrustline, createFundedTestAccount } from "./helpers.js";

const shouldRun =
  process.env.RUN_INTEGRATION === "1" && process.env.RUN_INTERACTIVE === "1";

describe.skipIf(!shouldRun)("SEP-24 interactive withdrawal flow", () => {
  it(
    "performs interactive deposit then interactive withdrawal flow to completion",
    async () => {
      const secret = await createFundedTestAccount();
      const anchor = getAnchor("sdf-testanchor");
      const srtAsset = anchor.assets.find((a) => a.code === "SRT");
      if (!srtAsset) {
        throw new Error("SRT asset not found on sdf-testanchor");
      }

      await addTrustline(secret, srtAsset.code, srtAsset.issuer);

      const ramp = createRamp({
        network: "testnet",
        anchorId: "sdf-testanchor",
        signer: keypairSigner(secret),
      });

      // 1. Get the asset with a deposit first if needed
      console.log("\n[Interactive Test] Initiating deposit for SRT...");
      const depositRes = await ramp.deposit({ assetCode: "SRT", amount: "5" });
      console.log(`[Interactive Test] Deposit URL: ${depositRes.url}`);
      console.log(
        "[Interactive Test] Please open the deposit URL in your browser and complete the flow."
      );

      // Wait for completed with ramp.watch (10 minute timeout)
      await new Promise<AnchorTransaction>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sub.stop();
          reject(new Error("Deposit flow timed out after 10 minutes"));
        }, 10 * 60 * 1000);

        const sub = ramp.watch(depositRes.id, {
          onStatus(status) {
            console.log(`[Interactive Test] Deposit status: ${status}`);
          },
          onComplete(tx) {
            clearTimeout(timeout);
            sub.stop();
            resolve(tx);
          },
          onError(err) {
            clearTimeout(timeout);
            sub.stop();
            reject(err);
          },
        });
      });

      // 2. Start a withdrawal, print its URL
      console.log("\n[Interactive Test] Starting withdrawal for SRT...");
      const withdrawRes = await ramp.withdraw({
        assetCode: "SRT",
        amount: "2",
      });
      console.log(`[Interactive Test] Withdrawal URL: ${withdrawRes.url}`);
      console.log(
        "[Interactive Test] Please open the withdrawal URL in your browser to proceed."
      );

      // Wait with ramp.watch (10 minute timeout) for pending_user_transfer_start
      await new Promise<AnchorTransaction>((resolve, reject) => {
        const timeout = setTimeout(() => {
          sub.stop();
          reject(
            new Error(
              "Withdrawal waiting for pending_user_transfer_start timed out after 10 minutes"
            )
          );
        }, 10 * 60 * 1000);

        const sub = ramp.watch(withdrawRes.id, {
          onStatus(status, tx) {
            console.log(`[Interactive Test] Withdrawal status: ${status}`);
            if (status === "pending_user_transfer_start") {
              clearTimeout(timeout);
              sub.stop();
              resolve(tx);
            }
          },
          onError(err) {
            clearTimeout(timeout);
            sub.stop();
            reject(err);
          },
        });
      });

      // 3. Call completeWithdrawal
      console.log("\n[Interactive Test] Calling completeWithdrawal...");
      const { hash } = await ramp.completeWithdrawal(withdrawRes.id);
      console.log(
        `[Interactive Test] Withdrawal payment submitted! Hash: ${hash}`
      );
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(64);

      // 4. Wait for completed, print the hash
      const completedTx = await new Promise<AnchorTransaction>(
        (resolve, reject) => {
          const timeout = setTimeout(() => {
            sub.stop();
            reject(
              new Error("Withdrawal completion timed out after 10 minutes")
            );
          }, 10 * 60 * 1000);

          const sub = ramp.watch(withdrawRes.id, {
            onStatus(status) {
              console.log(
                `[Interactive Test] Final withdrawal status: ${status}`
              );
            },
            onComplete(tx) {
              clearTimeout(timeout);
              sub.stop();
              resolve(tx);
            },
            onError(err) {
              clearTimeout(timeout);
              sub.stop();
              reject(err);
            },
          });
        }
      );

      console.log(
        `[Interactive Test] Withdrawal fully completed! Transaction ID: ${completedTx.id}`
      );
      console.log(`[Interactive Test] Completed withdrawal hash: ${hash}`);
      expect(completedTx.status).toBe("completed");
    },
    20 * 60 * 1000 // 20-minute test timeout
  );
});

