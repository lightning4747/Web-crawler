import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies
vi.mock("../config.js", () => {
  return {
    config: {
      WORKER_COUNT: 2,
      CRAWL_DELAY_MS: 1000,
    },
  };
});

vi.mock("../db/queries.js", () => {
  return {
    claimNextURL: vi.fn(),
  };
});

vi.mock("../frontier/frontier.js", () => {
  return {
    getPendingDomains: vi.fn(),
  };
});

vi.mock("../worker/worker.js", () => {
  return {
    processPage: vi.fn().mockResolvedValue(undefined),
  };
});

import { claimNextURL } from "../db/queries.js";
import { getPendingDomains } from "../frontier/frontier.js";
import { startScheduler, stopScheduler, getCooldown } from "../frontier/scheduler.js";

const mockClaimNextURL = vi.mocked(claimNextURL);
const mockGetPendingDomains = vi.mocked(getPendingDomains);

describe("Scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    stopScheduler();
  });

  it("should respect politeness delay (cooldowns) and round-robin domains", async () => {
    // Two domains are pending
    mockGetPendingDomains.mockResolvedValue(["react.dev", "typescriptlang.org"]);

    // Mock claimNextURL responses
    mockClaimNextURL
      .mockResolvedValueOnce({ id: 1, url: "https://react.dev", domain: "react.dev", status: "FETCHING", depth: 0 })
      .mockResolvedValueOnce({ id: 2, url: "https://typescriptlang.org", domain: "typescriptlang.org", status: "FETCHING", depth: 0 });

    // Start the scheduler
    const schedulerPromise = startScheduler();

    // Allow the first loop iteration to execute
    await vi.advanceTimersByTimeAsync(0);

    // Verify it claimed react.dev first
    expect(mockClaimNextURL).toHaveBeenNthCalledWith(1, "react.dev");
    const cooldownReact = getCooldown("react.dev");
    expect(cooldownReact).toBeGreaterThan(0);

    // Advance time slightly (100ms, less than 1000ms cooldown)
    await vi.advanceTimersByTimeAsync(100);

    // It should check the next domain in round robin, which is typescriptlang.org
    // Since typescriptlang.org has no cooldown, it should claim a URL for it
    expect(mockClaimNextURL).toHaveBeenNthCalledWith(2, "typescriptlang.org");
    const cooldownTS = getCooldown("typescriptlang.org");
    expect(cooldownTS).toBeGreaterThan(0);

    // Advance time slightly again
    await vi.advanceTimersByTimeAsync(100);
    // claimNextURL should not have been called a third time because both domains are on cooldown
    expect(mockClaimNextURL).toHaveBeenCalledTimes(2);

    // Stop scheduler to exit loop
    stopScheduler();
    await vi.advanceTimersByTimeAsync(100);
    await schedulerPromise;
  });
});
