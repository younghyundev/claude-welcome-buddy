const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

/**
 * Find the Claude Code cli.js file location
 */
function findCliJs() {
  try {
    const claudePath = execSync("which claude", { encoding: "utf8" }).trim();
    // Resolve symlinks to get to the actual installation
    const realPath = fs.realpathSync(claudePath);
    // Go from bin/claude -> lib/node_modules/@anthropic-ai/claude-code/cli.js
    const nodeDir = path.resolve(path.dirname(realPath), "..");
    const cliJs = path.join(
      nodeDir,
      "lib",
      "node_modules",
      "@anthropic-ai",
      "claude-code",
      "cli.js"
    );

    if (fs.existsSync(cliJs)) {
      return cliJs;
    }

    // Alternative: check global npm prefix
    const npmPrefix = execSync("npm prefix -g", { encoding: "utf8" }).trim();
    const altPath = path.join(
      npmPrefix,
      "lib",
      "node_modules",
      "@anthropic-ai",
      "claude-code",
      "cli.js"
    );

    if (fs.existsSync(altPath)) {
      return altPath;
    }

    console.error("Could not find Claude Code cli.js");
    console.error("Searched:");
    console.error(`  ${cliJs}`);
    console.error(`  ${altPath}`);
    return null;
  } catch (e) {
    console.error("Could not find Claude Code installation.");
    console.error("Make sure Claude Code is installed: npm install -g @anthropic-ai/claude-code");
    return null;
  }
}

module.exports = { findCliJs };
