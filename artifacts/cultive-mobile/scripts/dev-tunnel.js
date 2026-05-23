#!/usr/bin/env node
/**
 * Starts Expo with a real ngrok tunnel, bypassing the "log in with your
 * Expo account" interactive prompt that blocks --tunnel startup.
 *
 * Root cause: expo.pike.replit.dev returns HTTP 301 → HTTPS, which Expo Go's
 * exp:// handler does not follow. ngrok provides a direct HTTPS endpoint that
 * Expo Go can reach without a redirect.
 *
 * The prompt appears in @expo/cli's api/user/actions.js and asks the user to
 * log in or proceed anonymously. We patch that single callsite to always
 * proceed anonymously before handing off to the real expo CLI.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ---------------------------------------------------------------------------
// 1. Locate and patch the prompt callsite in @expo/cli
// ---------------------------------------------------------------------------
const ACTIONS_GLOB_PATTERN = path.join(
  __dirname,
  '../../node_modules/.pnpm/@expo+cli@*/node_modules/@expo/cli/build/src/api/user/actions.js'
);

const { globSync } = (() => {
  try { return require('glob'); }
  catch { return { globSync: () => [] }; }
})();

let actionsFiles = globSync(ACTIONS_GLOB_PATTERN);

// Fallback: walk the .pnpm tree manually if glob isn't available
if (!actionsFiles || actionsFiles.length === 0) {
  const pnpmDir = path.join(__dirname, '../../node_modules/.pnpm');
  if (fs.existsSync(pnpmDir)) {
    actionsFiles = fs.readdirSync(pnpmDir)
      .filter(d => d.startsWith('@expo+cli@'))
      .map(d => path.join(pnpmDir, d, 'node_modules/@expo/cli/build/src/api/user/actions.js'))
      .filter(f => fs.existsSync(f));
  }
}

const PROMPT_NEEDLE = "It is recommended to log in with your Expo account before proceeding.";
const PATCH_MARKER = '/* REPLIT_ANON_PATCH */';

for (const actionsFile of actionsFiles) {
  const src = fs.readFileSync(actionsFile, 'utf8');
  if (src.includes(PATCH_MARKER)) {
    // Already patched in a previous run — nothing to do
    continue;
  }
  if (!src.includes(PROMPT_NEEDLE)) {
    continue;
  }
  // Replace the selectAsync call that shows the prompt with an immediate
  // "proceed anonymously" (value = false) so the function returns null.
  const patched = src.replace(
    /const value = await \(0, _prompts\.selectAsync\)\([^;]+\);/,
    `const value = false; ${PATCH_MARKER}`
  );
  if (patched === src) {
    // Regex didn't match — try a simpler replacement
    console.warn('[dev-tunnel] Could not patch actions.js — prompt may still appear');
  } else {
    fs.writeFileSync(actionsFile, patched, 'utf8');
    console.log('[dev-tunnel] Patched Expo CLI to proceed anonymously automatically');
  }
}

// ---------------------------------------------------------------------------
// 2. Build the expo start command
// ---------------------------------------------------------------------------
const port = process.env.PORT || '21357';

const env = {
  ...process.env,
  EXPO_PUBLIC_DOMAIN:   process.env.REPLIT_DEV_DOMAIN || '',
  EXPO_PUBLIC_REPL_ID:  process.env.REPL_ID || '',
  // Do NOT set EXPO_PACKAGER_PROXY_URL so the real ngrok tunnel URL is used
  // in the manifest that Expo Go scans.
};

const args = [
  'exec', 'expo', 'start',
  '--tunnel',
  '--port', port,
];

console.log('[dev-tunnel] Starting Expo with tunnel on port', port);
console.log('[dev-tunnel] Expo Go will receive a public ngrok URL — no Replit proxy redirect.');

const result = spawnSync('pnpm', args, {
  env,
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});

process.exit(result.status ?? 0);
