import fs from "node:fs";
import { resolve } from "../lib/paths.mjs";

let pkg;
let plugin;

try {
  pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
} catch (err) {
  console.error(`Failed to read package.json: ${err.message}`);
  process.exit(1);
}

const pluginPath = resolve("openclaw.plugin.json");

try {
  plugin = JSON.parse(fs.readFileSync(pluginPath, "utf8"));
} catch (err) {
  console.error(`Failed to read openclaw.plugin.json: ${err.message}`);
  process.exit(1);
}

if (plugin.version !== pkg.version) {
  plugin.version = pkg.version;
  try {
    fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
    console.log(`Synced openclaw.plugin.json version to ${pkg.version}`);
  } catch (err) {
    console.error(`Failed to write openclaw.plugin.json: ${err.message}`);
    process.exit(1);
  }
} else {
  console.log(`Version already in sync: ${pkg.version}`);
}
