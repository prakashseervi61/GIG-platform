import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = fileURLToPath(new URL(".", import.meta.url));
const suites = [
  "week2-auth-registration-test.mjs",
  "week3-service-discovery-test.mjs",
  "week4-booking-payment-ratings-test.mjs",
  "week5-matching-logistics-test.mjs",
  "week6-verification-earnings-notifications-test.mjs",
  "week7-demand-forecast-ingest-test.mjs",
  "week8-journey-test.mjs",
];

// Every suite talks to the same database and permanently writes to it (bookings
// consume real worker slots, and the forecast is rebuilt in place). Running the
// suites twice against the same state therefore produces spurious failures that
// have nothing to do with the code under test -- e.g. a probe that finds "no
// open slot" because an earlier run already booked that worker.
//
// --fresh reseeds before the first suite so a green run means something.
// Suites still share state within a single run, which is the intended contract.
const wantFresh = process.argv.includes("--fresh");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const selected = only.length > 0 ? suites.filter((s) => only.some((o) => s.includes(o))) : suites;

if (selected.length === 0) {
  console.error(`No suite matched: ${only.join(", ")}`);
  console.error(`Available: ${suites.join(", ")}`);
  process.exit(1);
}

if (wantFresh) {
  const cwd = join(here, "..", "..");
  const seed = ["db:reset", "db:seed", "db:demo"];
  process.stderr.write("\n=== --fresh: reseeding database ===\n");
  for (const script of seed) {
    try {
      execFileSync("npm", ["run", script], { cwd, stdio: ["ignore", "inherit", "inherit"], shell: true });
    } catch (err) {
      console.error(`\n!!! SEED FAILED: npm run ${script} (exit ${err.status})`);
      process.exit(1);
    }
  }
  process.stderr.write("=== reseed complete ===\n");
}

let failed = false;
for (const suite of selected) {
  try {
    const out = execFileSync(process.execPath, [join(here, suite)], {
      stdio: ["ignore", "inherit", "inherit"],
    });
    process.stdout.write(out ?? "");
  } catch (err) {
    failed = true;
    console.error(`\n!!! SUITE FAILED: ${suite} (exit ${err.status})`);
  }
}

if (failed) {
  console.error("\nRun complete: one or more suites failed.");
  process.exit(1);
}
console.error(`\nRun complete: all ${selected.length} suites passed.`);
console.error("Tip: re-run with --fresh if suites fail on data they wrote in a previous run.");