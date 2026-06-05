import { describe, it, expect } from "vitest";
import { normalizeURL, getDomain } from "../normalizer.js";

describe("URL Normalizer", () => {
  describe("normalizeURL", () => {
    it("should resolve relative URLs against base URL", () => {
      expect(normalizeURL("/relative/path", "https://react.dev")).toBe("https://react.dev/relative/path");
      expect(normalizeURL("relative/path", "https://react.dev/sub/")).toBe("https://react.dev/sub/relative/path");
    });

    it("should strip trailing slash (including bare domain)", () => {
      expect(normalizeURL("https://example.com/", "https://react.dev")).toBe("https://example.com");
      expect(normalizeURL("https://example.com/about/", "https://react.dev")).toBe("https://example.com/about");
    });

    it("should strip fragments", () => {
      expect(normalizeURL("https://example.com#section", "https://react.dev")).toBe("https://example.com");
      expect(normalizeURL("https://example.com/about#team", "https://react.dev")).toBe("https://example.com/about");
    });

    it("should lowercase scheme and host", () => {
      expect(normalizeURL("HTTPS://EXAMPLE.COM/About", "https://react.dev")).toBe("https://example.com/About");
    });

    it("should filter out unsupported protocols", () => {
      expect(normalizeURL("ftp://example.com", "https://react.dev")).toBeNull();
      expect(normalizeURL("javascript:void(0)", "https://react.dev")).toBeNull();
      expect(normalizeURL("mailto:test@example.com", "https://react.dev")).toBeNull();
    });

    it("should preserve query parameters", () => {
      expect(normalizeURL("https://example.com/search?q=typescript", "https://react.dev")).toBe("https://example.com/search?q=typescript");
    });
  });

  describe("getDomain", () => {
    it("should extract hostname correctly", () => {
      expect(getDomain("https://react.dev/docs/getting-started")).toBe("react.dev");
      expect(getDomain("http://localhost:3000/test")).toBe("localhost");
      expect(getDomain("invalid-url")).toBeNull();
    });
  });
});
