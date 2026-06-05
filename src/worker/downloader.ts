import { request } from "undici";
import { config } from "../config.js";

export interface DownloaderResult {
  url: string;
  html: string;
  statusCode: number;
}

/**
 * Fetches the HTML content of a page, following redirects up to MAX_REDIRECTS.
 * Tracks the final URL and enforces a request timeout.
 */
export async function downloadPage(initialUrl: string): Promise<DownloaderResult> {
  let currentUrl = initialUrl;
  let redirectCount = 0;

  while (true) {
    const res = await request(currentUrl, {
      method: "GET",
      headersTimeout: config.REQUEST_TIMEOUT_MS,
      bodyTimeout: config.REQUEST_TIMEOUT_MS,
    });

    const statusCode = res.statusCode;

    // Handle Redirects (301, 302, 303, 307, 308)
    if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
      if (redirectCount >= config.MAX_REDIRECTS) {
        // Consume body to release connection pool slot
        await res.body.text();
        throw new Error("Too many redirects");
      }

      const location = Array.isArray(res.headers.location) ? res.headers.location[0] : res.headers.location;
      currentUrl = new URL(location, currentUrl).href;
      redirectCount++;

      await res.body.text(); // Consume body
      continue;
    }

    // Error on non-200 responses
    if (statusCode !== 200) {
      await res.body.text(); // Consume body
      throw new Error(`HTTP status ${statusCode}`);
    }

    // Check Content-Type (skip non-HTML)
    const contentTypeHeader = res.headers["content-type"];
    const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;
    if (contentType && !contentType.includes("text/html")) {
      await res.body.text(); // Consume body
      throw new Error(`Non-HTML content type: ${contentType}`);
    }

    const html = await res.body.text();
    return {
      url: currentUrl,
      html,
      statusCode,
    };
  }
}
