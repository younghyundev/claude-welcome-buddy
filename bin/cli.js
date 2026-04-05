#!/usr/bin/env node

const { apply, restore } = require("../lib/patcher");

const HELP = `
claude-welcome-buddy — Put your /buddy on the welcome screen

Usage:
  npx claude-welcome-buddy apply     Apply your /buddy to the welcome screen
  npx claude-welcome-buddy restore   Restore original welcome screen
`;

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  switch (command) {
    case "apply": {
      apply();
      break;
    }

    case "restore": {
      restore();
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exit(1);
  }
}

main();
