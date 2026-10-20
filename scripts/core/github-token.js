#!/usr/bin/env node
/**
 * github-token.js
 * Cross-platform GitHub token resolver for AI Weekly pipelines.
 * Resolution order:
 *   1. process.env.GH_TOKEN / process.env.GITHUB_TOKEN
 *   2. `gh auth token --hostname github.com` (using path.delimiter for Windows/macOS/Linux)
 *   3. `git credential fill` for https://github.com
 */
const path = require("path");
const { execSync, execFileSync } = require("child_process");

function resolveGitHubToken() {
  if (process.env.GH_TOKEN && process.env.GH_TOKEN.trim()) {
    return process.env.GH_TOKEN.trim();
  }
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
    return process.env.GITHUB_TOKEN.trim();
  }

  const extraPaths = process.platform === "win32"
    ? ["C:\\Program Files\\GitHub CLI", "C:\\Program Files (x86)\\GitHub CLI"]
    : ["/usr/local/bin", "/opt/homebrew/bin"];
  const envPath = [process.env.PATH || "", ...extraPaths]
    .filter(Boolean)
    .join(path.delimiter);

  try {
    const token = execFileSync("gh", ["auth", "token", "--hostname", "github.com"], {
      env: { ...process.env, PATH: envPath },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (token) return token;
  } catch (_) {}

  try {
    const out = execSync("git credential fill", {
      input: "protocol=https\nhost=github.com\n\n",
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
      timeout: 3000,
    });
    const match = out.match(/^password=(.+)$/m);
    if (match && match[1].trim()) {
      return match[1].trim();
    }
  } catch (_) {}

  return null;
}

module.exports = { resolveGitHubToken };
