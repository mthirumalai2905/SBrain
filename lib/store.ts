import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { DB } from "./types";
import { createSeed } from "./seed";

const file = path.join(process.cwd(), "data", "brain.json");

let queue: Promise<unknown> = Promise.resolve();

function ensure() {
  if (existsSync(file)) return;
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(createSeed(), null, 2));
}

export function readDb(): DB {
  ensure();
  return JSON.parse(readFileSync(file, "utf8")) as DB;
}

export function mutate<T>(fn: (db: DB) => T): Promise<T> {
  const run = queue.then(() => {
    const db = readDb();
    const result = fn(db);
    writeFileSync(file, JSON.stringify(db, null, 2));
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
