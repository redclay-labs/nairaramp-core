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

export interface WatchOptions {
  /** Initial polling delay in milliseconds (default: 2000). */
  initialDelayMs?: number;
  /** Maximum polling delay in milliseconds (default: 30000). */
  maxDelayMs?: number;
  /** Bounded jitter ratio applied to each scheduled delay (default: 0.15 for ±15%). Set to 0 to disable. */
  jitterRatio?: number;
  /** Optional PRNG returning [0, 1) for deterministic testing (default: Math.random). */
  random?: () => number;
}

function applyJitter(
  delayMs: number,
  jitterRatio: number,
  random: () => number
): number {
  if (jitterRatio <= 0) {
    return delayMs;
  }
  const clampedRatio = Math.min(jitterRatio, 0.5);
  const factor = 1 + (random() * 2 - 1) * clampedRatio;
  return Math.max(100, delayMs * factor);
}

export function watchTransaction(
  ramp: WatchableRamp,
  id: string,
  handlers: WatchHandlers,
  options?: WatchOptions
): WatchSubscription {
  const initialDelayMs = options?.initialDelayMs ?? 2000;
  const maxDelayMs = options?.maxDelayMs ?? 30000;
  const jitterRatio = options?.jitterRatio ?? 0.15;
  const random = options?.random ?? Math.random;

  let stopped = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let isPolling = false;
  let currentDelay = initialDelayMs;
  let consecutiveFailures = 0;
  let lastStatus: string | null = null;

  function scheduleNext(): void {
    const nextDelay = applyJitter(currentDelay, jitterRatio, random);
    timerId = setTimeout(() => {
      void poll();
    }, nextDelay);
  }

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
        currentDelay = Math.min(currentDelay * 1.5, maxDelayMs);
      } else if (tx.status !== lastStatus) {
        lastStatus = tx.status;
        currentDelay = initialDelayMs;
        handlers.onStatus?.(tx.status, tx);
      } else {
        currentDelay = Math.min(currentDelay * 1.5, maxDelayMs);
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
      scheduleNext();
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

      currentDelay = Math.min(currentDelay * 1.5, maxDelayMs);
      scheduleNext();
    } finally {
      isPolling = false;
    }
  }

  // Initial poll
  scheduleNext();

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

