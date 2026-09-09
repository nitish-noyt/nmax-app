#!/usr/bin/env node
/**
 * Copies the release APKs of one environment into dist/ under names that say
 * exactly what they are:
 *
 *   dist/nmax-admin-dev-1.5.1-20260909-2015.apk
 *   dist/nmax-admin-dev-latest.apk
 *
 * Usage: node scripts/collect-apks.js dev|prod
 */
const fs = require("fs");
const path = require("path");

const env = (process.argv[2] || "").toLowerCase();
if (!["dev", "prod"].includes(env)) {
  console.error("Usage: node scripts/collect-apks.js dev|prod");
  process.exit(1);
}

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const gradle = fs.readFileSync(path.join(root, "android/app/build.gradle"), "utf8");
const versionName = /versionName\s+"([^"]+)"/.exec(gradle)?.[1] ?? "0.0.0";
const suffix = env === "dev" ? "-dev" : "";
const fullVersion = `${versionName}${suffix}`;

const now = new Date();
const p = (n) => String(n).padStart(2, "0");
const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(
  now.getHours()
)}${p(now.getMinutes())}`;

fs.mkdirSync(dist, { recursive: true });

let copied = 0;
for (const role of ["admin", "client"]) {
  const variant = `${role}${env[0].toUpperCase()}${env.slice(1)}`;
  const built = path.join(
    root,
    "android/app/build/outputs/apk",
    variant,
    "release",
    `nmax-${role}-${env}-${fullVersion}.apk`
  );
  if (!fs.existsSync(built)) {
    console.error(`missing build output: ${path.relative(root, built)}`);
    process.exitCode = 1;
    continue;
  }
  const stamped = path.join(dist, `nmax-${role}-${env}-${versionName}-${stamp}.apk`);
  const latest = path.join(dist, `nmax-${role}-${env}-latest.apk`);
  fs.copyFileSync(built, stamped);
  fs.copyFileSync(built, latest);
  const mb = (fs.statSync(stamped).size / 1048576).toFixed(1);
  console.log(`${path.basename(stamped)}  (${mb} MB)  + ${path.basename(latest)}`);
  copied += 1;
}

if (copied) {
  console.log(`\n${copied} ${env} APK${copied > 1 ? "s" : ""} in dist/`);
}
