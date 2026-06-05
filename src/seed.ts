import { config } from "./config.js";
import { query } from "./db/client.js";
import { getDomain } from "./normalizer.js";

export async function seedDatabase() {
  for (const url of config.SEED_URLS) {
    const domain = getDomain(url);
    if (!domain) {
      continue;
    }
    await query(
      `INSERT INTO urls (url, domain, status, depth)
       VALUES ($1, $2, 'PENDING', 0)
       ON CONFLICT (url) DO NOTHING`,
      [url, domain]
    );
  }
}
