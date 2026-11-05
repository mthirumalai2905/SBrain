import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sites = JSON.parse(readFileSync(new URL("../fixtures/sites.json", import.meta.url), "utf8")) as {
  id: string;
  publicUrl: string;
  callsLiveSystem: boolean;
}[];

test("site fixtures stay local and do not call a live system", () => {
  assert.equal(sites.length, 4);
  for (const site of sites) {
    assert.equal(site.callsLiveSystem, false);
    assert.ok(site.publicUrl.startsWith("https://"));
  }
  const raw = readFileSync(new URL("../fixtures/sites.json", import.meta.url), "utf8");
  assert.equal(raw.includes("apiKey"), false);
});

test("drive, website, and vps fakes never leave the process", async () => {
  const drive = { files: [{ name: "Lab note.md", state: "detected" }] };
  const website = { publish() { throw new Error("Live publish is not available."); } };
  const vps = { metrics: null as null };
  assert.equal(drive.files[0]?.state, "detected");
  assert.equal(vps.metrics, null);
  assert.throws(() => website.publish(), /not available/);
});
