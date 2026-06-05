import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../db/queries.js", () => {
  return {
    getGlobalStats: vi.fn(),
    refreshDomainStats: vi.fn(),
    getDomainStats: vi.fn(),
  };
});

import { getGlobalStats, refreshDomainStats, getDomainStats } from "../db/queries.js";
import { startProgressLogger, stopProgressLogger } from "../frontier/logger.js";

const mockGetGlobalStats = vi.mocked(getGlobalStats);
const mockRefreshDomainStats = vi.mocked(refreshDomainStats);
const mockGetDomainStats = vi.mocked(getDomainStats);

describe("Progress Logger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    stopProgressLogger();
    vi.useRealTimers();
  });

  it("should initialize stats and periodically log progress report", async () => {
    mockGetGlobalStats.mockResolvedValue({ pending: 10, fetching: 2, done: 20, failed: 1 });
    mockGetDomainStats.mockResolvedValue([
      {
        domain: "react.dev",
        pending_count: 10,
        fetching_count: 2,
        done_count: 20,
        failed_count: 1,
        last_crawled_at: new Date("2026-06-05T12:00:00Z"),
      },
    ]);

    await startProgressLogger(5000);

    // Initial query should be called to establish baseline
    expect(mockGetGlobalStats).toHaveBeenCalledTimes(1);

    // Fast-forward 5 seconds
    await vi.advanceTimersByTimeAsync(5000);

    expect(mockRefreshDomainStats).toHaveBeenCalledTimes(1);
    expect(mockGetGlobalStats).toHaveBeenCalledTimes(2);
    expect(mockGetDomainStats).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Crawler Progress Report"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("PENDING : 10"));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("react.dev"));
  });

  it("should handle query errors gracefully", async () => {
    mockGetGlobalStats.mockRejectedValue(new Error("Database connection lost"));
    await startProgressLogger(5000);

    await vi.advanceTimersByTimeAsync(5000);

    expect(console.error).toHaveBeenCalledWith(
      "Error generating crawler progress logs:",
      expect.any(Error)
    );
  });
});
