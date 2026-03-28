import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  const domain = process.env["REPLIT_DEV_DOMAIN"];
  if (domain) {
    const pingUrl = `https://${domain}/api-server/api/healthz`;
    setInterval(async () => {
      try {
        const res = await fetch(pingUrl);
        logger.info({ status: res.status }, "Self-ping OK");
      } catch (e: any) {
        logger.warn({ err: e?.message }, "Self-ping failed");
      }
    }, 14 * 60 * 1000);
    logger.info({ pingUrl }, "Self-ping started (every 14 min)");
  }
});
