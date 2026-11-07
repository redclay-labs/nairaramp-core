import { NairaRampError } from "./errors.js";
import type { AnchorTransaction } from "./ramp.js";

export type TransactionStatus =
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

export const TERMINAL_STATUSES: readonly TransactionStatus[] = [
  "completed",
  "refunded",
  "expired",
  "no_market",
  "too_small",
  "too_large",
  "error",
] as const;

export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

export function isTerminalStatus(status: string): status is TerminalStatus {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

export interface WatchHandlers {
  onStatus?: (
    status: TransactionStatus | string,
    transaction: AnchorTransaction
  ) => void;
  onComplete?: (transaction: AnchorTransaction) => void;
  onError?: (error: NairaRampError) => void;
}

export interface WatchSubscription {
  stop(): void;
}

export interface WatchableRamp {
  getTransaction(id: string): Promise<AnchorTransaction>;
}

export function watchTransaction(
  ramp: WatchableRamp,
  id: string,
  handlers: WatchHandlers
): WatchSubscription {
  let stopped = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let isPolling = false;
  let currentDelay = 2000;
  let consecutiveFailures = 0;
  let lastStatus: string | null = null;

  async function poll(): Promise<void> {
    if (stopped || isPolling) {
      return;
    }

    isPolling = true;
    timerId = null;

    try {
      const tx = await ramp.getTransaction(id);
      if (stopped) {
        return;
      }

      consecutiveFailures = 0;

      if (lastStatus === null) {
        lastStatus = tx.status;
        handlers.onStatus?.(tx.status, tx);
        currentDelay = Math.min(currentDelay * 1.5, 30000);
      } else if (tx.status !== lastStatus) {
        lastStatus = tx.status;
        currentDelay = 2000;
        handlers.onStatus?.(tx.status, tx);
      } else {
        currentDelay = Math.min(currentDelay * 1.5, 30000);
      }

      if (tx.status === "completed") {
        stopped = true;
        handlers.onComplete?.(tx);
        return;
      }

      if (isTerminalStatus(tx.status)) {
        stopped = true;
        const msg =
          tx.message ||
          `Transaction ${id} ended with terminal status: ${tx.status}`;
        handlers.onError?.(new NairaRampError("TRANSACTION_FAILED", msg));
        return;
      }

      // Non-terminal status (including unknown status strings): schedule next poll
      timerId = setTimeout(() => {
        void poll();
      }, currentDelay);
    } catch (err) {
      if (stopped) {
        return;
      }

      consecutiveFailures++;
      if (consecutiveFailures >= 5) {
        stopped = true;
        const detail = err instanceof Error ? err.message : String(err);
        handlers.onError?.(
          new NairaRampError(
            "ANCHOR_UNREACHABLE",
            `Transaction polling failed after 5 consecutive attempts: ${detail}`,
            { cause: err }
          )
        );
        return;
      }

      currentDelay = Math.min(currentDelay * 1.5, 30000);
      timerId = setTimeout(() => {
        void poll();
      }, currentDelay);
    } finally {
      isPolling = false;
    }
  }

  // Initial poll after 2000ms
  timerId = setTimeout(() => {
    void poll();
  }, currentDelay);

  return {
    stop(): void {
      stopped = true;
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    },
  };
}

