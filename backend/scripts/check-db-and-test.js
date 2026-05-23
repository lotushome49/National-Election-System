#!/usr/bin/env node
import { spawn } from "child_process";
import process from "process";
import fs from "fs";

// Load .env if present
try {
  const dotenv = await import("dotenv");
  dotenv.config();
} catch (e) {
  // ignore
}

const db = process.env.DATABASE_URL;
if (!db) {
  console.error(
    "Skipping tests: DATABASE_URL is not set. Set DATABASE_URL to run integration tests.",
  );
  process.exit(0);
}

const args = ["--import", "tsx", "--test", "tests/**/*.test.ts"];
const proc = spawn("node", args, { stdio: "inherit" });
proc.on("exit", (code) => process.exit(code ?? 0));
