import { syncCommand } from "../lib/commands/sync.mjs";

const exitCode = syncCommand();
process.exit(exitCode);
