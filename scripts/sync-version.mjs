import fs from "node:fs";
import { resolve } from "../lib/paths.mjs";

const pkg = JSON.parse(fs.readFileSync(resolve("package.json"), "utf8"));
const pluginPath = resolve("openclaw.plugin.json");
const plugin = JSON.parse(fs.readFileSync(pluginPath, "utf8"));

if (plugin.version !== pkg.version) {
  plugin.version = pkg.version;
  fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
  console.log(`Synced openclaw.plugin.json version to ${pkg.version}`);
} else {
  console.log(`Version already in sync: ${pkg.version}`);
}
