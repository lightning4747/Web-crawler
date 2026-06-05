import { request } from "undici";
// @ts-ignore
import robotsParser from "robots-parser";
import { getDomain } from "../normalizer.js";
import { config } from "../config.js";

const robotsCache = new Map<string, any>();
const fetchFailures = new Set<string>();

/**
 * Checks if a URL is allowed to be crawled according to the domain's robots.txt rules.
 * Caches robots.txt rules per domain to avoid duplicate requests.
 */
export async function isAllowedByRobots(urlStr: string): Promise<boolean> {
  const domain = getDomain(urlStr);
  if (!domain) return false;

  if (fetchFailures.has(domain)) {
    return true;
  }

  let parser = robotsCache.get(domain);

  if (!parser) {
    const robotsUrl = `https://${domain}/robots.txt`;
    try {
      const res = await request(robotsUrl, {
        method: "GET",
        headersTimeout: config.REQUEST_TIMEOUT_MS,
        bodyTimeout: config.REQUEST_TIMEOUT_MS,
      });

      if (res.statusCode === 200) {
        const content = await res.body.text();
        const parserCreator = robotsParser as any;
        parser = parserCreator(robotsUrl, content);
        robotsCache.set(domain, parser);
      } else {
        fetchFailures.add(domain);
        return true;
      }
    } catch (e) {
      // On network/request errors, default to allowed but do not permanently cache failure
      return true;
    }
  }

  const isAllowed = parser.isAllowed(urlStr, "WebCrawler");
  return isAllowed === undefined ? true : isAllowed;
}
