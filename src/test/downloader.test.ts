import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock undici request function
vi.mock("undici", () => {
  return {
    request: vi.fn(),
  };
});

vi.mock("../config.js", () => {
  return {
    config: {
      REQUEST_TIMEOUT_MS: 1000,
      MAX_REDIRECTS: 2,
    },
  };
});

import { request } from "undici";
import { downloadPage } from "../worker/downloader.js";

const mockedRequest = vi.mocked(request);

describe("HTTP Downloader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully download HTML page", async () => {
    mockedRequest.mockResolvedValue({
      statusCode: 200,
      headers: { "content-type": "text/html" },
      body: { text: async () => "<html>Hello</html>" },
    } as any);

    const result = await downloadPage("https://react.dev");

    expect(result).toEqual({
      url: "https://react.dev",
      html: "<html>Hello</html>",
      statusCode: 200,
    });
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("should follow redirects manually and return final URL", async () => {
    mockedRequest
      .mockResolvedValueOnce({
        statusCode: 301,
        headers: { location: "https://react.dev/docs" },
        body: { text: async () => "" },
      } as any)
      .mockResolvedValueOnce({
        statusCode: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
        body: { text: async () => "docs html" },
      } as any);

    const result = await downloadPage("https://react.dev");

    expect(result).toEqual({
      url: "https://react.dev/docs",
      html: "docs html",
      statusCode: 200,
    });
    expect(mockedRequest).toHaveBeenCalledTimes(2);
    expect(mockedRequest).toHaveBeenNthCalledWith(1, "https://react.dev", expect.any(Object));
    expect(mockedRequest).toHaveBeenNthCalledWith(2, "https://react.dev/docs", expect.any(Object));
  });

  it("should throw error if redirect limit is exceeded", async () => {
    mockedRequest.mockResolvedValue({
      statusCode: 302,
      headers: { location: "https://react.dev/loop" },
      body: { text: async () => "" },
    } as any);

    await expect(downloadPage("https://react.dev")).rejects.toThrow("Too many redirects");
    expect(mockedRequest).toHaveBeenCalledTimes(3); // 1 initial + 2 redirects (max redirects is 2)
  });

  it("should throw error for non-200 HTTP status code", async () => {
    mockedRequest.mockResolvedValue({
      statusCode: 404,
      headers: {},
      body: { text: async () => "Not Found" },
    } as any);

    await expect(downloadPage("https://react.dev")).rejects.toThrow("HTTP status 404");
  });

  it("should throw error for non-HTML content types", async () => {
    mockedRequest.mockResolvedValue({
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: { text: async () => "{}" },
    } as any);

    await expect(downloadPage("https://react.dev")).rejects.toThrow("Non-HTML content type");
  });
});
