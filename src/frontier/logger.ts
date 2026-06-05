import { getGlobalStats, refreshDomainStats, getDomainStats } from "../db/queries.js";

let loggerInterval: any = null;
let lastDoneAndFailedCount = 0;
let startTime = 0;

/**
 * Starts a background interval to log crawler progress periodically.
 */
export async function startProgressLogger(intervalMs: number = 5000): Promise<void> {
  if (loggerInterval) return;

  startTime = Date.now();
  try {
    const initialStats = await getGlobalStats();
    lastDoneAndFailedCount = initialStats.done + initialStats.failed;
  } catch (err) {
    lastDoneAndFailedCount = 0;
  }

  loggerInterval = setInterval(async () => {
    try {
      // 1. Sync statistics to domain_stats table
      await refreshDomainStats();

      // 2. Fetch global statistics
      const globalStats = await getGlobalStats();

      // 3. Fetch domain-level statistics
      const domainStats = await getDomainStats();

      // 4. Calculate crawl rates
      const currentCompleted = globalStats.done + globalStats.failed;
      const completedSinceStart = currentCompleted - lastDoneAndFailedCount;
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      const crawlRate = elapsedMinutes > 0 ? (completedSinceStart / elapsedMinutes).toFixed(1) : "0.0";

      // 5. Build and output the formatted log messages
      console.log(`\n=== Crawler Progress Report ===`);
      console.log(`Speed: ${crawlRate} pages/min`);
      console.log(`Global Status Breakdown:`);
      console.log(`  PENDING : ${globalStats.pending}`);
      console.log(`  FETCHING: ${globalStats.fetching}`);
      console.log(`  DONE    : ${globalStats.done}`);
      console.log(`  FAILED  : ${globalStats.failed}`);

      if (domainStats.length > 0) {
        console.log(`Domain Breakdown:`);
        for (const ds of domainStats) {
          const lastCrawledStr = ds.last_crawled_at ? ds.last_crawled_at.toISOString() : "never";
          console.log(
            `  - ${ds.domain}: PENDING: ${ds.pending_count} | FETCHING: ${ds.fetching_count} | DONE: ${ds.done_count} | FAILED: ${ds.failed_count} (Last Crawled: ${lastCrawledStr})`
          );
        }
      }
      console.log(`================================\n`);
    } catch (error) {
      console.error("Error generating crawler progress logs:", error);
    }
  }, intervalMs);

  if (loggerInterval && typeof loggerInterval.unref === "function") {
    loggerInterval.unref();
  }
}

/**
 * Stops the progress logger interval.
 */
export function stopProgressLogger(): void {
  if (loggerInterval) {
    clearInterval(loggerInterval);
    loggerInterval = null;
  }
}
