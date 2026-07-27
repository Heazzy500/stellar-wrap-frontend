import { beforeEach, describe, it, expect, vi } from "vitest";
import { useWrapStore } from "@/app/store/wrapStore";
import type { PersistedIndexingState } from "@/app/types/indexing";
import { STEP_ORDER } from "@/app/types/indexing";

const PERSISTENCE_KEY = "stellar-wrap-indexing-state";
const PERSISTENCE_TIMEOUT = 5 * 60 * 1000;

const BASE_STEP_PROGRESS: Record<string, number> = {
  initializing: 0,
  "fetching-transactions": 0,
  "filtering-timeframes": 0,
  "calculating-volume": 0,
  "identifying-assets": 0,
  "counting-contracts": 0,
  finalizing: 0,
};

const BASE_COMPLETED_RECORD: Record<string, boolean> = {
  initializing: false,
  "fetching-transactions": false,
  "filtering-timeframes": false,
  "calculating-volume": false,
  "identifying-assets": false,
  "counting-contracts": false,
  finalizing: false,
};

const BASE_STEP_TIMINGS: Record<string, number> = {
  initializing: 0,
  "fetching-transactions": 0,
  "filtering-timeframes": 0,
  "calculating-volume": 0,
  "identifying-assets": 0,
  "counting-contracts": 0,
  finalizing: 0,
};

describe("wrapStore indexing persistence lifecycle", () => {
  let storageMap: Map<string, string>;
  let getItemSpy: ReturnType<typeof vi.fn>;
  let setItemSpy: ReturnType<typeof vi.fn>;
  let removeItemSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storageMap = new Map<string, string>();
    const mockStorageBackend = {
      getItem: (key: string) =>
        storageMap.has(key) ? (storageMap.get(key) as string) : null,
      setItem: (key: string, value: string) => storageMap.set(key, value),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
      length: 0,
      key: (_index: number) => null,
    };
    getItemSpy = vi.fn(mockStorageBackend.getItem);
    setItemSpy = vi.fn(mockStorageBackend.setItem);
    removeItemSpy = vi.fn(mockStorageBackend.removeItem);

    const storageWithSpies: Storage = {
      ...mockStorageBackend,
      getItem: getItemSpy,
      setItem: setItemSpy,
      removeItem: removeItemSpy,
    } as Storage;

    vi.stubGlobal("window", { localStorage: storageWithSpies });
    vi.stubGlobal("localStorage", storageWithSpies);

    const state = useWrapStore.getState();
    state.reset();
    state.clearPersistedIndexingState();
    try {
      useWrapStore.persist.clearStorage?.();
    } catch {
      // no-op
    }

    getItemSpy.mockClear();
    setItemSpy.mockClear();
    removeItemSpy.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    try {
      vi.unstubAllGlobals();
    } catch {
      // no-op
    }
  });

  describe("A. Fresh State Hydration", () => {
    it("rehydrates a valid, fresh indexing state (t < PERSISTENCE_TIMEOUT)", () => {
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      const freshTs = now - 60_000;
      const persisted: PersistedIndexingState = {
        currentStep: "fetching-transactions",
        completedSteps: 1,
        stepProgress: {
          ...BASE_STEP_PROGRESS,
          initializing: 100,
          "fetching-transactions": 40,
        } as PersistedIndexingState["stepProgress"],
        overallProgress: 15,
        completedStepRecord: {
          ...BASE_COMPLETED_RECORD,
          initializing: true,
        } as PersistedIndexingState["completedStepRecord"],
        stepTimings: { ...BASE_STEP_TIMINGS } as PersistedIndexingState["stepTimings"],
        startTime: now - 90_000,
        timestamp: freshTs,
      };
      storageMap.set(PERSISTENCE_KEY, JSON.stringify(persisted));

      const loaded = useWrapStore.getState().loadIndexingState();

      expect(loaded).toBe(true);
      const s = useWrapStore.getState();
      expect(s.currentStep).toBe("fetching-transactions");
      expect(s.completedSteps).toBe(1);
      expect(s.overallProgress).toBeGreaterThanOrEqual(15);
      expect(s.stepProgress.initializing).toBe(100);
      expect(s.stepProgress["fetching-transactions"]).toBe(40);
      expect(s.completedStepRecord.initializing).toBe(true);
      expect(s.startTime).toBe(now - 90_000);
      expect(s.isLoading).toBe(true);
      expect(s.isCancelled).toBe(false);
      expect(storageMap.has(PERSISTENCE_KEY)).toBe(true);
      expect(removeItemSpy).not.toHaveBeenCalledWith(PERSISTENCE_KEY);

      vi.useRealTimers();
    });

    it("rehydrates exactly at boundary t = PERSISTENCE_TIMEOUT - 1ms (still fresh)", () => {
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      const boundaryFreshTs = now - (PERSISTENCE_TIMEOUT - 1);
      const persisted: PersistedIndexingState = {
        currentStep: "identifying-assets",
        completedSteps: 3,
        stepProgress: { ...BASE_STEP_PROGRESS } as PersistedIndexingState["stepProgress"],
        overallProgress: 45,
        completedStepRecord: { ...BASE_COMPLETED_RECORD } as PersistedIndexingState["completedStepRecord"],
        stepTimings: { ...BASE_STEP_TIMINGS } as PersistedIndexingState["stepTimings"],
        startTime: now - 120_000,
        timestamp: boundaryFreshTs,
      };
      storageMap.set(PERSISTENCE_KEY, JSON.stringify(persisted));

      const loaded = useWrapStore.getState().loadIndexingState();

      expect(loaded).toBe(true);
      const s = useWrapStore.getState();
      expect(s.currentStep).toBe("identifying-assets");
      expect(s.isLoading).toBe(true);
      expect(storageMap.has(PERSISTENCE_KEY)).toBe(true);
      expect(removeItemSpy).not.toHaveBeenCalledWith(PERSISTENCE_KEY);

      vi.useRealTimers();
    });
  });

  describe("B. Expired State Clearing & Rejection", () => {
    it("rejects state exactly at boundary t = PERSISTENCE_TIMEOUT and purges storage", () => {
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      const expiredTs = now - PERSISTENCE_TIMEOUT;
      const persisted: PersistedIndexingState = {
        currentStep: "fetching-transactions",
        completedSteps: 1,
        stepProgress: {
          ...BASE_STEP_PROGRESS,
          initializing: 100,
          "fetching-transactions": 80,
        } as PersistedIndexingState["stepProgress"],
        overallProgress: 25,
        completedStepRecord: {
          ...BASE_COMPLETED_RECORD,
          initializing: true,
        } as PersistedIndexingState["completedStepRecord"],
        stepTimings: { ...BASE_STEP_TIMINGS } as PersistedIndexingState["stepTimings"],
        startTime: now - 3_600_000,
        timestamp: expiredTs,
      };
      storageMap.set(PERSISTENCE_KEY, JSON.stringify(persisted));

      const loaded = useWrapStore.getState().loadIndexingState();

      expect(loaded).toBe(false);
      expect(removeItemSpy).toHaveBeenCalledTimes(1);
      expect(removeItemSpy).toHaveBeenCalledWith(PERSISTENCE_KEY);
      expect(storageMap.has(PERSISTENCE_KEY)).toBe(false);

      const s = useWrapStore.getState();
      expect(s.currentStep).toBe(null);
      expect(s.completedSteps).toBe(0);
      expect(s.overallProgress).toBe(0);
      expect(s.isLoading).toBe(false);
      expect(s.isCancelled).toBe(false);
      expect(s.indexingError).toBe(null);
      expect(s.startTime).toBe(null);
      STEP_ORDER.forEach((step) => {
        expect(s.stepProgress[step]).toBe(0);
        expect(s.completedStepRecord[step]).toBe(false);
      });

      vi.useRealTimers();
    });

    it("rejects stale state (t >> PERSISTENCE_TIMEOUT) and does NOT resurrect stale loading UI", () => {
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      const staleTs = now - PERSISTENCE_TIMEOUT - 3_600_000;
      const persisted: PersistedIndexingState = {
        currentStep: "finalizing",
        completedSteps: 6,
        stepProgress: {
          ...BASE_STEP_PROGRESS,
          finalizing: 99,
        } as PersistedIndexingState["stepProgress"],
        overallProgress: 98,
        completedStepRecord: { ...BASE_COMPLETED_RECORD } as PersistedIndexingState["completedStepRecord"],
        stepTimings: { ...BASE_STEP_TIMINGS } as PersistedIndexingState["stepTimings"],
        startTime: staleTs,
        timestamp: staleTs,
      };
      storageMap.set(PERSISTENCE_KEY, JSON.stringify(persisted));

      const loaded = useWrapStore.getState().loadIndexingState();

      expect(loaded).toBe(false);
      expect(removeItemSpy).toHaveBeenCalledWith(PERSISTENCE_KEY);
      expect(storageMap.has(PERSISTENCE_KEY)).toBe(false);

      const s = useWrapStore.getState();
      expect(s.currentStep).toBe(null);
      expect(s.isLoading).toBe(false);
      expect(s.overallProgress).toBe(0);
      expect(s.completedSteps).toBe(0);

      vi.useRealTimers();
    });
  });

  describe("C. Time-Fast-Forwarding / Active Expiry", () => {
    it("accepts fresh state, then after advancing past PERSISTENCE_TIMEOUT rejects on re-check", () => {
      const T0 = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(T0);

      const persisted: PersistedIndexingState = {
        currentStep: "filtering-timeframes",
        completedSteps: 2,
        stepProgress: { ...BASE_STEP_PROGRESS } as PersistedIndexingState["stepProgress"],
        overallProgress: 40,
        completedStepRecord: { ...BASE_COMPLETED_RECORD } as PersistedIndexingState["completedStepRecord"],
        stepTimings: { ...BASE_STEP_TIMINGS } as PersistedIndexingState["stepTimings"],
        startTime: T0 - 30_000,
        timestamp: T0 - 1_000,
      };
      storageMap.set(PERSISTENCE_KEY, JSON.stringify(persisted));

      const loaded = useWrapStore.getState().loadIndexingState();
      expect(loaded).toBe(true);
      const s1 = useWrapStore.getState();
      expect(s1.currentStep).toBe("filtering-timeframes");
      expect(s1.isLoading).toBe(true);
      expect(storageMap.has(PERSISTENCE_KEY)).toBe(true);

      vi.advanceTimersByTime(PERSISTENCE_TIMEOUT - 1_000 + 1);

      const loaded2 = useWrapStore.getState().loadIndexingState();
      expect(loaded2).toBe(false);
      expect(removeItemSpy).toHaveBeenCalledWith(PERSISTENCE_KEY);
      expect(storageMap.has(PERSISTENCE_KEY)).toBe(false);

      vi.useRealTimers();
    });

    it("boundary check: advancing by exactly PERSISTENCE_TIMEOUT triggers purge (t + 1ms effective)", () => {
      const T0 = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(T0);

      const persisted: PersistedIndexingState = {
        currentStep: "counting-contracts",
        completedSteps: 5,
        stepProgress: { ...BASE_STEP_PROGRESS } as PersistedIndexingState["stepProgress"],
        overallProgress: 80,
        completedStepRecord: { ...BASE_COMPLETED_RECORD } as PersistedIndexingState["completedStepRecord"],
        stepTimings: { ...BASE_STEP_TIMINGS } as PersistedIndexingState["stepTimings"],
        startTime: T0 - 200_000,
        timestamp: T0,
      };
      storageMap.set(PERSISTENCE_KEY, JSON.stringify(persisted));

      expect(useWrapStore.getState().loadIndexingState()).toBe(true);

      vi.advanceTimersByTime(PERSISTENCE_TIMEOUT + 1);

      const result = useWrapStore.getState().loadIndexingState();
      expect(result).toBe(false);
      expect(removeItemSpy).toHaveBeenCalledWith(PERSISTENCE_KEY);
      expect(storageMap.has(PERSISTENCE_KEY)).toBe(false);

      vi.useRealTimers();
    });
  });

  describe("D. Corrupted JSON Recovery", () => {
    it("handles malformed JSON string, purges key, and falls back to initial state", () => {
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      storageMap.set(PERSISTENCE_KEY, "{ malformed_json: ");

      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => void 0);

      const loaded = useWrapStore.getState().loadIndexingState();

      expect(loaded).toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(removeItemSpy).toHaveBeenCalledWith(PERSISTENCE_KEY);
      expect(storageMap.has(PERSISTENCE_KEY)).toBe(false);

      const s = useWrapStore.getState();
      expect(s.currentStep).toBe(null);
      expect(s.isLoading).toBe(false);
      expect(s.overallProgress).toBe(0);
      expect(s.completedSteps).toBe(0);
      expect(s.startTime).toBe(null);
      expect(s.indexingError).toBe(null);
      expect(s.isCancelled).toBe(false);

      consoleWarnSpy.mockRestore();
      vi.useRealTimers();
    });

    it("handles valid JSON but non-object primitive payload gracefully and purges storage", () => {
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      storageMap.set(PERSISTENCE_KEY, JSON.stringify("just-a-string"));

      const loaded = useWrapStore.getState().loadIndexingState();

      expect(loaded).toBe(false);
      expect(removeItemSpy).toHaveBeenCalledWith(PERSISTENCE_KEY);
      expect(storageMap.has(PERSISTENCE_KEY)).toBe(false);
      const s = useWrapStore.getState();
      expect(s.currentStep).toBe(null);
      expect(s.isLoading).toBe(false);

      vi.useRealTimers();
    });

    it("handles valid JSON object with null timestamp gracefully and purges storage", () => {
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      const invalidShape = {
        currentStep: "initializing",
        timestamp: null,
      };
      storageMap.set(PERSISTENCE_KEY, JSON.stringify(invalidShape));

      const loaded = useWrapStore.getState().loadIndexingState();

      expect(loaded).toBe(false);
      expect(removeItemSpy).toHaveBeenCalledWith(PERSISTENCE_KEY);
      expect(storageMap.has(PERSISTENCE_KEY)).toBe(false);
      const s = useWrapStore.getState();
      expect(s.currentStep).toBe(null);
      expect(s.isLoading).toBe(false);
      expect(s.overallProgress).toBe(0);

      vi.useRealTimers();
    });

    it("handles valid JSON object with timestamp set to non-number string and purges storage", () => {
      const now = 1_700_000_000_000;
      vi.useFakeTimers().setSystemTime(now);

      const invalidTimestamp = {
        currentStep: "initializing",
        completedSteps: 0,
        stepProgress: { ...BASE_STEP_PROGRESS },
        overallProgress: 0,
        completedStepRecord: { ...BASE_COMPLETED_RECORD },
        stepTimings: { ...BASE_STEP_TIMINGS },
        startTime: null,
        timestamp: "not-a-number",
      };
      storageMap.set(PERSISTENCE_KEY, JSON.stringify(invalidTimestamp));

      const loaded = useWrapStore.getState().loadIndexingState();

      expect(loaded).toBe(false);
      expect(removeItemSpy).toHaveBeenCalledWith(PERSISTENCE_KEY);
      expect(storageMap.has(PERSISTENCE_KEY)).toBe(false);
      const s = useWrapStore.getState();
      expect(s.isLoading).toBe(false);
      expect(s.currentStep).toBe(null);

      vi.useRealTimers();
    });
  });
});
