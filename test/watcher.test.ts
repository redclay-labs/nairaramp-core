import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  TERMINAL_STATUSES,
  type AnchorTransaction,
  type TerminalStatus,
  type WatchableRamp,
  watchTransaction,
} from "../src/index.js";
import { isNairaRampError } from "../src/errors.js";

describe("Transaction watcher", () => {
  let mockGetTransaction: ReturnType<
    typeof vi.fn<(id: string) => Promise<AnchorTransaction>>
  >;
  let mockRamp: WatchableRamp;

  beforeEach(() => {
    vi.useFakeTimers();
    mockGetTransaction =
      vi.fn<(id: string) => Promise<AnchorTransaction>>();
    mockRamp = {
      getTransaction: mockGetTransaction,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("follows backoff sequence 2000, 3000, 4500 ... capped at 30000 while status is unchanged", async () => {
    const tx: AnchorTransaction = {
      id: "tx-1",
      status: "incomplete" as unknown as AnchorTransaction["status"],
      amount_in: "10.0",
      amount_out: "9.5",
      stellar_transaction_id: "stx-1",
      withdraw_anchor_account: undefined,
      withdraw_memo: undefined,
      withdraw_memo_type: undefined as unknown as AnchorTransaction["withdraw_memo_type"],
      message: undefined,
    };
    mockGetTransaction.mockResolvedValue(tx);

    const onStatus = vi.fn();
    const sub = watchTransaction(mockRamp, "tx-1", { onStatus });

    expect(vi.getTimerCount()).toBe(1);

    // Initial wait: 2000 ms
    await vi.advanceTimersByTimeAsync(1999);
    expect(mockGetTransaction).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(mockGetTransaction).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledWith("incomplete", tx);

    // 2nd poll: 2000 * 1.5 = 3000 ms
    await vi.advanceTimersByTimeAsync(2999);
    expect(mockGetTransaction).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mockGetTransaction).toHaveBeenCalledTimes(2);
    expect(onStatus).toHaveBeenCalledTimes(1); // unchanged, not emitted

    // 3rd poll: 3000 * 1.5 = 4500 ms
    await vi.advanceTimersByTimeAsync(4499);
    expect(mockGetTransaction).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(mockGetTransaction).toHaveBeenCalledTimes(3);

    // 4th poll: 4500 * 1.5 = 6750 ms
    await vi.advanceTimersByTimeAsync(6750);
    expect(mockGetTransaction).toHaveBeenCalledTimes(4);

    // 5th poll: 6750 * 1.5 = 10125 ms
    await vi.advanceTimersByTimeAsync(10125);
    expect(mockGetTransaction).toHaveBeenCalledTimes(5);

    // 6th poll: 10125 * 1.5 = 15187.5 ms
    await vi.advanceTimersByTimeAsync(15187.5);
    expect(mockGetTransaction).toHaveBeenCalledTimes(6);

    // 7th poll: 15187.5 * 1.5 = 22781.25 ms
    await vi.advanceTimersByTimeAsync(22781.25);
    expect(mockGetTransaction).toHaveBeenCalledTimes(7);

    // 8th poll: 22781.25 * 1.5 = 34171.875 -> capped at 30000 ms
    await vi.advanceTimersByTimeAsync(29999);
    expect(mockGetTransaction).toHaveBeenCalledTimes(7);
    await vi.advanceTimersByTimeAsync(1);
    expect(mockGetTransaction).toHaveBeenCalledTimes(8);

    // 9th poll: capped at 30000 ms
    await vi.advanceTimersByTimeAsync(29999);
    expect(mockGetTransaction).toHaveBeenCalledTimes(8);
    await vi.advanceTimersByTimeAsync(1);
    expect(mockGetTransaction).toHaveBeenCalledTimes(9);

    sub.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets delay to 2000 ms on status change and emits onStatus only on change", async () => {
    const tx1: AnchorTransaction = {
      id: "tx-1",
      status: "incomplete" as unknown as AnchorTransaction["status"],
      amount_in: "10.0",
      amount_out: "9.5",
      stellar_transaction_id: undefined,
      withdraw_anchor_account: undefined,
      withdraw_memo: undefined,
      withdraw_memo_type: undefined as unknown as AnchorTransaction["withdraw_memo_type"],
      message: undefined,
    };
    const tx2: AnchorTransaction = {
      ...tx1,
      status: "pending_anchor" as unknown as AnchorTransaction["status"],
    };

    mockGetTransaction
      .mockResolvedValueOnce(tx1)
      .mockResolvedValueOnce(tx1)
      .mockResolvedValueOnce(tx2)
      .mockResolvedValueOnce(tx2);

    const onStatus = vi.fn();
    const sub = watchTransaction(mockRamp, "tx-1", { onStatus });

    // Poll 1 (2000 ms): initial status "incomplete"
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockGetTransaction).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenLastCalledWith("incomplete", tx1);

    // Poll 2 (3000 ms): unchanged "incomplete", onStatus NOT called
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockGetTransaction).toHaveBeenCalledTimes(2);
    expect(onStatus).toHaveBeenCalledTimes(1);

    // Poll 3 (4500 ms): status changed to "pending_anchor"!
    await vi.advanceTimersByTimeAsync(4500);
    expect(mockGetTransaction).toHaveBeenCalledTimes(3);
    expect(onStatus).toHaveBeenCalledTimes(2);
    expect(onStatus).toHaveBeenLastCalledWith("pending_anchor", tx2);

    // Poll 4: delay should have reset to 2000 ms!
    await vi.advanceTimersByTimeAsync(1999);
    expect(mockGetTransaction).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(mockGetTransaction).toHaveBeenCalledTimes(4);
    expect(onStatus).toHaveBeenCalledTimes(2); // unchanged from "pending_anchor"

    sub.stop();
  });

  it("stops and invokes onComplete when status is completed", async () => {
    const txCompleted: AnchorTransaction = {
      id: "tx-1",
      status: "completed" as unknown as AnchorTransaction["status"],
      amount_in: "10.0",
      amount_out: "9.5",
      stellar_transaction_id: "stellar-tx-abc",
      withdraw_anchor_account: undefined,
      withdraw_memo: undefined,
      withdraw_memo_type: undefined as unknown as AnchorTransaction["withdraw_memo_type"],
      message: undefined,
    };

    mockGetTransaction.mockResolvedValue(txCompleted);

    const onStatus = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const sub = watchTransaction(mockRamp, "tx-1", {
      onStatus,
      onComplete,
      onError,
    });

    await vi.advanceTimersByTimeAsync(2000);

    expect(mockGetTransaction).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledWith("completed", txCompleted);
    expect(onComplete).toHaveBeenCalledWith(txCompleted);
    expect(onError).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0); // watcher stopped, no remaining timers

    // Further time advance produces no polls
    await vi.advanceTimersByTimeAsync(60000);
    expect(mockGetTransaction).toHaveBeenCalledTimes(1);

    sub.stop();
  });

  describe("stops on each terminal status with TRANSACTION_FAILED", () => {
    const otherTerminalStatuses: TerminalStatus[] = [
      "refunded",
      "expired",
      "no_market",
      "too_small",
      "too_large",
      "error",
    ];

    it.each(otherTerminalStatuses)(
      "stops and calls onError for terminal status %s",
      async (status) => {
        const txTerminal: AnchorTransaction = {
          id: "tx-term",
          status: status as unknown as AnchorTransaction["status"],
          amount_in: "10.0",
          amount_out: "9.5",
          stellar_transaction_id: undefined,
          withdraw_anchor_account: undefined,
          withdraw_memo: undefined,
          withdraw_memo_type: undefined as unknown as AnchorTransaction["withdraw_memo_type"],
          message: `Anchor reported terminal failure: ${status}`,
        };

        mockGetTransaction.mockResolvedValue(txTerminal);

        const onStatus = vi.fn();
        const onComplete = vi.fn();
        const onError = vi.fn();

        watchTransaction(mockRamp, "tx-term", {
          onStatus,
          onComplete,
          onError,
        });

        await vi.advanceTimersByTimeAsync(2000);

        expect(mockGetTransaction).toHaveBeenCalledTimes(1);
        expect(onStatus).toHaveBeenCalledWith(status, txTerminal);
        expect(onComplete).not.toHaveBeenCalled();
        expect(onError).toHaveBeenCalledTimes(1);

        const errorArg = onError.mock.calls[0]?.[0];
        expect(isNairaRampError(errorArg)).toBe(true);
        expect(errorArg.code).toBe("TRANSACTION_FAILED");
        expect(errorArg.message).toContain(
          `Anchor reported terminal failure: ${status}`
        );

        expect(vi.getTimerCount()).toBe(0); // Stopped
      }
    );
  });

  it("stop() leaves vi.getTimerCount() === 0 and halts future polling", async () => {
    const tx: AnchorTransaction = {
      id: "tx-1",
      status: "incomplete" as unknown as AnchorTransaction["status"],
      amount_in: "10.0",
      amount_out: "9.5",
      stellar_transaction_id: undefined,
      withdraw_anchor_account: undefined,
      withdraw_memo: undefined,
      withdraw_memo_type: undefined as unknown as AnchorTransaction["withdraw_memo_type"],
      message: undefined,
    };
    mockGetTransaction.mockResolvedValue(tx);

    const sub = watchTransaction(mockRamp, "tx-1", {});
    expect(vi.getTimerCount()).toBe(1);

    sub.stop();
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(100000);
    expect(mockGetTransaction).not.toHaveBeenCalled();
  });

  it("handles stop() called while a poll is in-flight", async () => {
    let resolveTx: (tx: AnchorTransaction) => void;
    const pendingPromise = new Promise<AnchorTransaction>((resolve) => {
      resolveTx = resolve;
    });
    mockGetTransaction.mockReturnValue(pendingPromise);

    const onStatus = vi.fn();
    const sub = watchTransaction(mockRamp, "tx-1", { onStatus });

    // Trigger initial poll
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockGetTransaction).toHaveBeenCalledTimes(1);

    // Stop while request is pending
    sub.stop();

    // Now resolve the in-flight transaction
    const tx: AnchorTransaction = {
      id: "tx-1",
      status: "incomplete" as unknown as AnchorTransaction["status"],
      amount_in: "10.0",
      amount_out: "9.5",
      stellar_transaction_id: undefined,
      withdraw_anchor_account: undefined,
      withdraw_memo: undefined,
      withdraw_memo_type: undefined as unknown as AnchorTransaction["withdraw_memo_type"],
      message: undefined,
    };
    resolveTx!(tx);
    await Promise.resolve();

    expect(onStatus).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("triggers ANCHOR_UNREACHABLE after 5 consecutive polling failures", async () => {
    mockGetTransaction.mockRejectedValue(new Error("Network timeout"));

    const onStatus = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    watchTransaction(mockRamp, "tx-err", {
      onStatus,
      onComplete,
      onError,
    });

    // 1st failure (2000 ms)
    await vi.advanceTimersByTimeAsync(2000);
    expect(mockGetTransaction).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();

    // 2nd failure (3000 ms)
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockGetTransaction).toHaveBeenCalledTimes(2);
    expect(onError).not.toHaveBeenCalled();

    // 3rd failure (4500 ms)
    await vi.advanceTimersByTimeAsync(4500);
    expect(mockGetTransaction).toHaveBeenCalledTimes(3);
    expect(onError).not.toHaveBeenCalled();

    // 4th failure (6750 ms)
    await vi.advanceTimersByTimeAsync(6750);
    expect(mockGetTransaction).toHaveBeenCalledTimes(4);
    expect(onError).not.toHaveBeenCalled();

    // 5th failure (10125 ms) -> triggers onError and stops
    await vi.advanceTimersByTimeAsync(10125);
    expect(mockGetTransaction).toHaveBeenCalledTimes(5);
    expect(onError).toHaveBeenCalledTimes(1);

    const errorArg = onError.mock.calls[0]?.[0];
    expect(isNairaRampError(errorArg)).toBe(true);
    expect(errorArg.code).toBe("ANCHOR_UNREACHABLE");
    expect(errorArg.message).toContain("5 consecutive attempts");
    expect(errorArg.cause).toBeDefined();

    expect(vi.getTimerCount()).toBe(0); // Watcher stopped
  });

  it("resets failure counter on a successful poll", async () => {
    const tx: AnchorTransaction = {
      id: "tx-recover",
      status: "incomplete" as unknown as AnchorTransaction["status"],
      amount_in: "10.0",
      amount_out: "9.5",
      stellar_transaction_id: undefined,
      withdraw_anchor_account: undefined,
      withdraw_memo: undefined,
      withdraw_memo_type: undefined as unknown as AnchorTransaction["withdraw_memo_type"],
      message: undefined,
    };

    // 4 failures, 1 success, 4 failures, 1 failure (total 9 failures, 5th consecutive at end)
    mockGetTransaction
      .mockRejectedValueOnce(new Error("Fail 1"))
      .mockRejectedValueOnce(new Error("Fail 2"))
      .mockRejectedValueOnce(new Error("Fail 3"))
      .mockRejectedValueOnce(new Error("Fail 4"))
      .mockResolvedValueOnce(tx) // success resets failure counter!
      .mockRejectedValueOnce(new Error("Fail 5"))
      .mockRejectedValueOnce(new Error("Fail 6"))
      .mockRejectedValueOnce(new Error("Fail 7"))
      .mockRejectedValueOnce(new Error("Fail 8"))
      .mockRejectedValueOnce(new Error("Fail 9"));

    const onError = vi.fn();
    const sub = watchTransaction(mockRamp, "tx-recover", { onError });

    // Advance 4 failures
    await vi.advanceTimersByTimeAsync(2000); // 1
    await vi.advanceTimersByTimeAsync(3000); // 2
    await vi.advanceTimersByTimeAsync(4500); // 3
    await vi.advanceTimersByTimeAsync(6750); // 4
    expect(onError).not.toHaveBeenCalled();

    // 5th poll succeeds
    await vi.advanceTimersByTimeAsync(10125);
    expect(mockGetTransaction).toHaveBeenCalledTimes(5);
    expect(onError).not.toHaveBeenCalled();

    // 4 more failures: failure counter is 4
    await vi.advanceTimersByTimeAsync(15187.5); // fail 1
    await vi.advanceTimersByTimeAsync(22781.25); // fail 2
    await vi.advanceTimersByTimeAsync(30000); // fail 3
    await vi.advanceTimersByTimeAsync(30000); // fail 4
    expect(onError).not.toHaveBeenCalled();

    // 5th consecutive failure after success
    await vi.advanceTimersByTimeAsync(30000); // fail 5
    expect(onError).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);

    sub.stop();
  });

  it("passes unknown status strings to onStatus and treats them as non-terminal", async () => {
    const unknownTx: AnchorTransaction = {
      id: "tx-unknown",
      status: "pending_custom_compliance" as unknown as AnchorTransaction["status"],
      amount_in: "10.0",
      amount_out: "9.5",
      stellar_transaction_id: undefined,
      withdraw_anchor_account: undefined,
      withdraw_memo: undefined,
      withdraw_memo_type: undefined as unknown as AnchorTransaction["withdraw_memo_type"],
      message: undefined,
    };
    mockGetTransaction.mockResolvedValue(unknownTx);

    const onStatus = vi.fn();
    const onComplete = vi.fn();
    const onError = vi.fn();

    const sub = watchTransaction(mockRamp, "tx-unknown", {
      onStatus,
      onComplete,
      onError,
    });

    await vi.advanceTimersByTimeAsync(2000);

    expect(mockGetTransaction).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledWith("pending_custom_compliance", unknownTx);
    expect(onComplete).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    // Watcher continues polling (timer count is 1)
    expect(vi.getTimerCount()).toBe(1);

    sub.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exports TERMINAL_STATUSES with all 7 terminal statuses", () => {
    expect(TERMINAL_STATUSES).toEqual([
      "completed",
      "refunded",
      "expired",
      "no_market",
      "too_small",
      "too_large",
      "error",
    ]);
  });
});
