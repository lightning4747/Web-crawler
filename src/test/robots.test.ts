import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("undici", () => {
  return {
    request: vi.fn(),
  };
});

vi.mock("../config.js", () => {
  return {
    config: {
      REQUEST_TIMEOUT_MS: 1000,
    },
  };
});

import { request } from "undici";
import { isAllowedByRobots } from "../frontier/robots.js";

const mockedRequest = vi.mocked(request);

describe("robots.txt compliance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow URLs if robots.txt allows it", async () => {
    mockedRequest.mockResolvedValue({
      statusCode: 200,
      body: {
        text: async () => `
          User-agent: *
          Disallow: /private/
        `,
      },
    } as any);

    const allowed = await isAllowedByRobots("https://react.dev/docs");
    expect(allowed).toBe(true);

    const disallowed = await isAllowedByRobots("https://react.dev/private/secret");
    expect(disallowed).toBe(false);
  });

  it("should allow URLs if robots.txt returns 404", async () => {
    mockedRequest.mockResolvedValue({
      statusCode: 404,
      body: {
        text: async () => "Not Found",
      },
    } as any);

    const allowed = await isAllowedByRobots("https://react.dev/docs");
    expect(allowed).toBe(true);
  });
});
