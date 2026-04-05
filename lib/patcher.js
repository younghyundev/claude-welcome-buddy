const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { findCliJs } = require("./finder");

const BACKUP_SUFFIX = ".buddy-backup";

function ensureBackup(cliJsPath) {
  const backupPath = cliJsPath + BACKUP_SUFFIX;
  if (!fs.existsSync(backupPath)) {
    console.log("📦 Creating backup of cli.js...");
    fs.copyFileSync(cliJsPath, backupPath);
    console.log(`   Backup saved to: ${backupPath}`);
  }
  return backupPath;
}

/**
 * Find a top-level object by content pattern.
 * Returns { start, objStart, end, varName } or null.
 * Properly skips string literals when counting braces.
 */
function findObjectByPattern(content, regex) {
  const m = regex.exec(content);
  if (!m) return null;
  const eqPos = content.indexOf("{", m.index);
  return { start: m.index, objStart: eqPos, end: findMatchingBrace(content, eqPos), varName: m[1] };
}

/**
 * Find matching closing brace, skipping string literals.
 */
function findMatchingBrace(content, openPos) {
  let braceCount = 0;
  let inString = false;
  let stringChar = "";
  for (let i = openPos; i < content.length; i++) {
    const ch = content[i];
    if (inString) {
      if (ch === "\\" ) { i++; continue; }
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === "{") braceCount++;
    if (ch === "}") braceCount--;
    if (braceCount === 0) return i + 1;
  }
  return -1;
}

/**
 * Find a named function's exact boundaries.
 */
function findFunction(content, name) {
  const marker = `function ${name}(`;
  const idx = content.indexOf(marker);
  if (idx < 0) return null;
  let braceCount = 0;
  let started = false;
  for (let i = idx; i < content.length; i++) {
    if (content[i] === "{") { braceCount++; started = true; }
    if (content[i] === "}") braceCount--;
    if (started && braceCount === 0) {
      return { start: idx, end: i + 1 };
    }
  }
  return null;
}

// --- Species data ---

function findSpeciesObject(content) {
  return findObjectByPattern(content, /(\w+)=\{\[\w+\]:\[\[/);
}

function parseSpeciesKeys(content, bounds) {
  const objStr = content.substring(bounds.objStart, bounds.end);
  const keyPattern = /\[(\w+)\]\s*:/g;
  const keys = [];
  let m;
  while ((m = keyPattern.exec(objStr)) !== null) {
    keys.push({ varName: m[1], offset: m.index });
  }
  return keys;
}

function extractSpeciesFrames(content, bounds, keyIndex) {
  const keys = parseSpeciesKeys(content, bounds);
  if (keyIndex < 0 || keyIndex >= keys.length) return null;

  const objStr = content.substring(bounds.objStart, bounds.end);
  const key = keys[keyIndex];
  const keyStr = `[${key.varName}]:`;
  const keyPos = objStr.indexOf(keyStr);
  const arrayStart = objStr.indexOf("[", keyPos + keyStr.length);

  let bracketCount = 0;
  let arrayEnd = arrayStart;
  for (let i = arrayStart; i < objStr.length; i++) {
    if (objStr[i] === "[") bracketCount++;
    if (objStr[i] === "]") bracketCount--;
    if (bracketCount === 0) { arrayEnd = i + 1; break; }
  }

  const raw = objStr.substring(arrayStart, arrayEnd);
  // Parse the frames - they're arrays of arrays of strings
  try {
    return JSON.parse(raw);
  } catch {
    // Manual parse for unquoted content
    const frames = [];
    const frameRegex = /\[([^\]]*(?:\[[^\]]*\][^\]]*)*)\]/g;
    let fm;
    while ((fm = frameRegex.exec(raw)) !== null) {
      const lines = [];
      const lineRegex = /"([^"]*)"/g;
      let lm;
      while ((lm = lineRegex.exec(fm[1])) !== null) {
        lines.push(lm[1]);
      }
      if (lines.length === 5) frames.push(lines);
    }
    return frames.length ? frames : null;
  }
}

// --- Auto-detect user's buddy ---

function detectBuddy(content) {
  // Read config to get user ID
  const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  const configPath = path.join(configDir, ".config.json");
  const altPath = path.join(
    process.env.CLAUDE_CONFIG_DIR || os.homedir(),
    ".claude.json"
  );

  let config;
  for (const p of [configPath, altPath]) {
    try {
      config = JSON.parse(fs.readFileSync(p, "utf8"));
      break;
    } catch {}
  }

  if (!config) {
    console.error("Could not read Claude config. Run /buddy in Claude Code first.");
    return null;
  }

  if (!config.companion) {
    console.error("No buddy found. Run /buddy in Claude Code first to hatch one.");
    return null;
  }

  const userId = config.oauthAccount?.accountUuid ?? config.userID ?? "anon";

  // Extract seed constant from cli.js
  const seedMatch = content.match(/PE_="([^"]+)"/);
  const seed = seedMatch ? seedMatch[1] : "friend-2026-401";

  // FNV-1a hash
  const seedStr = userId + seed;
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = h >>> 0;

  // Seeded PRNG
  let state = h >>> 0;
  function prng() {
    state |= 0;
    state = (state + 1831565813) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Extract W54 species count from cli.js
  const w54Match = content.match(/W54=\[([^\]]+)\]/);
  const speciesCount = w54Match ? w54Match[1].split(",").length : 18;

  const eyes = ["·", "✦", "×", "◉", "@", "°"];

  // Rarity weights (JE_ function logic)
  const rarityWeights = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };
  const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary"];
  const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);

  // WE_ call order: rarity(1), species(1), eye(1)
  const rarityRoll = prng() * totalWeight;
  let rarity = "common";
  let acc = 0;
  for (const r of rarityOrder) {
    acc += rarityWeights[r];
    if (rarityRoll < acc) { rarity = r; break; }
  }

  const speciesIndex = Math.floor(prng() * speciesCount);
  const eyeIndex = Math.floor(prng() * eyes.length);

  // Map W54 index to SdK key index
  const w54Keys = w54Match ? w54Match[1].split(",") : [];
  const bounds = findSpeciesObject(content);
  const sdkKeys = bounds ? parseSpeciesKeys(content, bounds) : [];

  let sdkIndex = speciesIndex;
  if (w54Keys.length && sdkKeys.length) {
    const targetVar = w54Keys[speciesIndex];
    const found = sdkKeys.findIndex((k) => k.varName === targetVar);
    if (found >= 0) sdkIndex = found;
  }

  // Rarity → Ink theme color token
  const rarityColors = {
    common: "inactive",
    uncommon: "success",
    rare: "permission",
    epic: "autoAccept",
    legendary: "warning",
  };

  return {
    name: config.companion.name,
    speciesIndex: sdkIndex,
    eye: eyes[eyeIndex],
    rarity,
    color: rarityColors[rarity],
  };
}

// --- Apply: replace welcome screen buddy with ASCII art ---

/**
 * Build a replacement wM6 function that renders ASCII art lines.
 * Uses the same React primitives (pz.createElement, T, u) and K6 memoization.
 * @param {string[]} lines - ASCII art lines
 * @param {string} color - Ink theme color token (e.g. "inactive", "success", "warning")
 */
function buildReplacementFunction(lines, color) {
  const colorAttr = color ? `"${color}"` : `"clawd_body"`;
  const escapedLines = lines.map((l) => JSON.stringify(l));
  const lineElements = escapedLines
    .map((l) => `pz.createElement(T,{color:${colorAttr}},${l})`)
    .join(",");

  return `function wM6(q){let K=K6(26);if(K[0]===Symbol.for("react.memo_cache_sentinel")){K[0]=pz.createElement(u,{flexDirection:"column",alignItems:"center"},${lineElements})}return K[0]}`;
}

/**
 * Auto-detect /buddy and apply its ASCII art to the welcome screen.
 */
function apply() {
  const cliJsPath = findCliJs();
  if (!cliJsPath) return;

  let content = fs.readFileSync(cliJsPath, "utf8");

  const buddy = detectBuddy(content);
  if (!buddy) process.exit(1);

  const { speciesIndex, eye, color: rarityColor, name, rarity } = buddy;
  console.log(`\n🐾 Detected buddy: ${name} (${rarity})`);

  const bounds = findSpeciesObject(content);
  if (!bounds) {
    console.error("Could not find buddy sprite data in cli.js");
    process.exit(1);
  }

  const keys = parseSpeciesKeys(content, bounds);
  if (speciesIndex < 0 || speciesIndex >= keys.length) {
    console.error(`Species index ${speciesIndex} out of range (0-${keys.length - 1})`);
    process.exit(1);
  }

  const frames = extractSpeciesFrames(content, bounds, speciesIndex);
  if (!frames || !frames[0]) {
    console.error("Could not extract sprite frames");
    process.exit(1);
  }

  let lines = frames[0].map((l) => l.replaceAll("{E}", eye));
  if (!lines[0].trim()) {
    lines = lines.slice(1);
  }

  ensureBackup(cliJsPath);

  const funcBounds = findFunction(content, "wM6");
  if (!funcBounds) {
    console.error("Could not find welcome screen render function (wM6) in cli.js");
    process.exit(1);
  }

  const replacement = buildReplacementFunction(lines, rarityColor);
  content = content.substring(0, funcBounds.start) + replacement + content.substring(funcBounds.end);

  fs.writeFileSync(cliJsPath, content, "utf8");

  console.log("\n   Preview:");
  lines.forEach((l) => console.log(`     ${l}`));
  console.log("\n✅ Restart Claude Code to see the changes.");
  console.log("   Run 'npx claude-welcome-buddy restore' to undo.\n");
}

/**
 * Restore cli.js from backup
 */
function restore() {
  const cliJsPath = findCliJs();
  if (!cliJsPath) return;

  const backupPath = cliJsPath + BACKUP_SUFFIX;
  if (!fs.existsSync(backupPath)) {
    console.error("No backup found. Nothing to restore.");
    process.exit(1);
  }

  fs.copyFileSync(backupPath, cliJsPath);
  fs.unlinkSync(backupPath);
  console.log("\n✅ Restored original cli.js from backup.");
  console.log("   Restart Claude Code to see the changes.\n");
}

module.exports = { apply, restore };
