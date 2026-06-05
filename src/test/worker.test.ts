import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock downloader
vi.mock("../worker/downloader.js", () => {
  return {
    downloadPage: vi.fn(),
  };
});

// Mock extractor
vi.mock("../worker/extractor.js", () => {
  return {
    extractPageData: vi.fn(),
  };
});

// Mock db queries
vi.mock("../db/queries.js", () => {
  return {
    insertURL: vi.fn(),
    insertLink: vi.fn(),
    markDone: vi.fn(),
    markFailed: vi.fn(),
  };
});

vi.mock("../config.js", () => {
  return {
    config: {
      ALLOWED_DOMAINS: ["react.dev"],
      MAX_DEPTH: 2,
    },
  };
});

vi.mock("../frontier/robots.js", () => {
  return {
    isAllowedByRobots: vi.fn(),
  };
});

import { downloadPage } from "../worker/downloader.js";
import { extractPageData } from "../worker/extractor.js";
import { insertURL, insertLink, markDone, markFailed } from "../db/queries.js";
import { isAllowedByRobots } from "../frontier/robots.js";
import { processPage } from "../worker/worker.js";

const mockDownloadPage = vi.mocked(downloadPage);
const mockExtractPageData = vi.mocked(extractPageData);
const mockInsertURL = vi.mocked(insertURL);
const mockInsertLink = vi.mocked(insertLink);
const mockMarkDone = vi.mocked(markDone);
const mockMarkFailed = vi.mocked(markFailed);
const mockIsAllowedByRobots = vi.mocked(isAllowedByRobots);

describe("Worker Pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowedByRobots.mockResolvedValue(true);
  });

  it("should successfully process a page, extract content, and insert links", async () => {
    mockDownloadPage.mockResolvedValue({
      url: "https://react.dev/docs",
      html: "<html>...</html>",
      statusCode: 200,
    });

    mockExtractPageData.mockReturnValue({
      title: "React Docs",
      description: "Learn React",
      canonicalUrl: "https://react.dev/docs",
      headings: { h1: ["Docs"], h2: [], h3: [] },
      textContent: "Learn React content",
      links: ["/tutorial", "https://external.com", "https://react.dev/docs"],
    });

    mockInsertURL.mockResolvedValue(100);

    await processPage({ id: 42, url: "https://react.dev/docs", depth: 1 });

    expect(mockMarkDone).toHaveBeenCalledTimes(1);
    expect(mockMarkDone).toHaveBeenCalledWith(42, {
      title: "React Docs",
      description: "Learn React",
      canonicalUrl: "https://react.dev/docs",
      headings: { h1: ["Docs"], h2: [], h3: [] },
      textContent: "Learn React content",
    });

    expect(mockInsertURL).toHaveBeenCalledTimes(1);
    expect(mockInsertURL).toHaveBeenCalledWith("https://react.dev/tutorial", "react.dev", 2);

    expect(mockInsertLink).toHaveBeenCalledTimes(1);
    expect(mockInsertLink).toHaveBeenCalledWith(42, 100);

    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it("should mark URL as FAILED if download fails", async () => {
    mockDownloadPage.mockRejectedValue(new Error("Network Error"));

    await expect(processPage({ id: 42, url: "https://react.dev/docs", depth: 1 })).rejects.toThrow("Network Error");

    expect(mockMarkFailed).toHaveBeenCalledTimes(1);
    expect(mockMarkFailed).toHaveBeenCalledWith(42, "Network Error");
    expect(mockMarkDone).not.toHaveBeenCalled();
  });

  it("should discard links that exceed MAX_DEPTH", async () => {
    mockDownloadPage.mockResolvedValue({
      url: "https://react.dev/docs",
      html: "<html>...</html>",
      statusCode: 200,
    });

    mockExtractPageData.mockReturnValue({
      title: "React Docs",
      description: "Learn React",
      canonicalUrl: "https://react.dev/docs",
      headings: { h1: ["Docs"], h2: [], h3: [] },
      textContent: "Learn React content",
      links: ["/tutorial"],
    });

    // Run with current depth = 2, so nextDepth = 3 which exceeds MAX_DEPTH = 2
    await processPage({ id: 42, url: "https://react.dev/docs", depth: 2 });

    expect(mockMarkDone).toHaveBeenCalledTimes(1);
    expect(mockInsertURL).not.toHaveBeenCalled();
    expect(mockInsertLink).not.toHaveBeenCalled();
  });

  it("should abort crawl if URL is disallowed by robots.txt", async () => {
    mockIsAllowedByRobots.mockResolvedValue(false);

    await processPage({ id: 42, url: "https://react.dev/private", depth: 1 });

    expect(mockMarkFailed).toHaveBeenCalledTimes(1);
    expect(mockMarkFailed).toHaveBeenCalledWith(42, "Disallowed by robots.txt");
    expect(mockDownloadPage).not.toHaveBeenCalled();
    expect(mockMarkDone).not.toHaveBeenCalled();
  });
});
