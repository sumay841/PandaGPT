import app from "./app";
import { logger } from "./lib/logger";

// Fail fast if required secrets are missing
if (!process.env["OPENROUTER_API_KEY"]) {
  throw new Error(
    "OPENROUTER_API_KEY environment variable is required but was not set. " +
    "Add it as a Replit Secret in the Secrets panel."
  );
}

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
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
});
