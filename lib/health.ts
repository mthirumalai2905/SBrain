import tls from "tls";
import type { Probe } from "./types";

function readCertificate(host: string) {
  return new Promise<{ expires: string; error: string }>((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 12000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      const parsed = cert?.valid_to ? new Date(cert.valid_to) : null;
      if (!parsed || Number.isNaN(parsed.getTime())) {
        resolve({ expires: "", error: "Certificate details were unreadable." });
        return;
      }
      resolve({ expires: parsed.toISOString(), error: "" });
    });
    socket.on("error", (error) => resolve({ expires: "", error: error.message }));
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ expires: "", error: "The certificate check timed out." });
    });
  });
}

export async function probeUrl(siteId: string, url: string): Promise<Probe> {
  const started = Date.now();
  let status = 0;
  let error = "";
  let ok = false;
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "BrainHealth/1.0" },
    });
    status = response.status;
    ok = response.ok;
    await response.arrayBuffer();
  } catch (err) {
    error = err instanceof Error ? err.message : "The request failed.";
  }
  const ms = Date.now() - started;
  const cert = await readCertificate(new URL(url).hostname);
  return {
    url,
    siteId,
    ok,
    status,
    ms,
    error,
    certExpires: cert.expires,
    certError: cert.error,
    checkedAt: new Date().toISOString(),
  };
}

export async function probeSites(sites: { id: string; checks: string[] }[]) {
  return Promise.all(sites.flatMap((site) => site.checks.map((url) => probeUrl(site.id, url))));
}
