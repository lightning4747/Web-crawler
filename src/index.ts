import { seedDatabase } from "./seed.js";
import { startScheduler } from "./frontier/scheduler.js";
import { pool } from "./db/client.js";

async function main() {
  console.log("Web Crawler starting...");

  try {
    // 1. Seed database with initial URLs at startup
    await seedDatabase();

    // 2. Start the scheduling loop (handles worker dispatching)
    await startScheduler();

    console.log("Crawling finished.");
  } catch (error) {
    console.error("Fatal error in main crawler loop:", error);
  } finally {
    // 3. Clean shutdown: Close the PostgreSQL pool
    await pool.end();
    console.log("Database connection pool closed.");
  }
}

main();
