import { existsSync, readFileSync } from "fs";
import path from "path";

export const GITHUB_APP_ID = "5678168";
export const GITHUB_APP_INSTALLATION_ID = "180136178";
export const GITHUB_APP_PRIVATE_KEY_PATH = "D:\\Brain\\secrets\\github-app.pem";

export const GITHUB_REPOS: Record<string, string> = {
  synx: "Synx-tools/Synx",
  realtimeweb: "Synx-tools/therealwebpoc",
  morph: "Synx-tools/morph-space",
  skalle: "Synx-tools/skalleaiLP",
};

const REPO_ENV: Record<string, string> = {
  synx: "GITHUB_REPO_SYNX",
  realtimeweb: "GITHUB_REPO_REALTIMEWEB",
  morph: "GITHUB_REPO_MORPH",
  skalle: "GITHUB_REPO_SKALLE",
};

function normalizePem(value: string) {
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  return trimmed.includes("\\n") ? trimmed.replace(/\\n/g, "\n") : trimmed;
}

function readPemFile(filePath: string) {
  if (!filePath || !existsSync(filePath)) return "";
  return readFileSync(filePath, "utf8");
}

export function githubAppId(env: Record<string, string | undefined>) {
  const value = env.GITHUB_APP_ID?.trim() ?? "";
  if (value) return value;
  if (env !== process.env) return "";
  return GITHUB_APP_ID;
}

export function githubInstallationId(env: Record<string, string | undefined>) {
  const value = env.GITHUB_APP_INSTALLATION_ID?.trim() ?? "";
  if (value) return value;
  if (env !== process.env) return "";
  return GITHUB_APP_INSTALLATION_ID;
}

export function githubRepoSlug(siteId: string, env: Record<string, string | undefined>) {
  const key = REPO_ENV[siteId];
  if (!key) return "";
  const value = env[key]?.trim() ?? "";
  if (value) return value;
  if (env !== process.env) return "";
  return GITHUB_REPOS[siteId] ?? "";
}

export function githubPrivateKey(env: Record<string, string | undefined>, pemText?: string) {
  if (pemText?.includes("PRIVATE KEY")) return normalizePem(pemText);
  const inline = env.GITHUB_APP_PRIVATE_KEY?.trim() ?? "";
  if (inline) return normalizePem(inline);
  const fromPath = readPemFile(env.GITHUB_APP_PRIVATE_KEY_PATH?.trim() ?? "");
  if (fromPath) return fromPath;
  if (env !== process.env) return "";
  return readPemFile(GITHUB_APP_PRIVATE_KEY_PATH) || readPemFile(path.join(process.cwd(), "secrets", "github-app.pem"));
}

export function githubCredentialsReady(env: Record<string, string | undefined>, keyReady?: boolean) {
  if (!/^\d+$/.test(githubAppId(env)) || !/^\d+$/.test(githubInstallationId(env))) return false;
  if (keyReady !== undefined) return keyReady;
  return githubPrivateKey(env).includes("PRIVATE KEY");
}
