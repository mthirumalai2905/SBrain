import { connection } from "next/server";
import { readDb } from "./store";

export async function liveDb() {
  await connection();
  return readDb();
}
