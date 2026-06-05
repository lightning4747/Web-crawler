import { describe, it, expect, vi } from "vitest";

// Mock pg module before importing client
vi.mock("pg", () => {
  const queryMock = vi.fn().mockResolvedValue({ rows: [] });
  const endMock = vi.fn().mockResolvedValue(undefined);
  class PoolMock {
    query = queryMock;
    end = endMock;
  }
  return {
    default: {
      Pool: PoolMock,
    },
    Pool: PoolMock,
  };
});

import { pool, query, closePool } from "../db/client.js";

describe("Database Client", () => {
  it("should expose pool and query function", async () => {
    expect(pool).toBeDefined();
    expect(query).toBeDefined();
    expect(closePool).toBeDefined();
  });

  it("should delegate query call to pool", async () => {
    const res = await query("SELECT 1");
    expect(res).toEqual({ rows: [] });
    expect(pool.query).toHaveBeenCalledWith("SELECT 1", undefined);
  });

  it("should call end on pool when closing", async () => {
    await closePool();
    expect(pool.end).toHaveBeenCalled();
  });
});
