import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db/client.js", () => {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  };
});

vi.mock("../config.js", () => {
  return {
    config: {
      SEED_URLS: ["https://react.dev", "not-a-url"],
    },
  };
});

import { seedDatabase } from "../seed.js";
import { query } from "../db/client.js";

describe("Seeding Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should insert valid seed URLs and skip invalid ones", async () => {
    await seedDatabase();

    // query should only be called once, for "https://react.dev"
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO urls"),
      ["https://react.dev", "react.dev"]
    );
  });
});
