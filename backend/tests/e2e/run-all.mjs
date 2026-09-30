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

let failed = false;
for (const suite of suites) {
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
console.error("\nRun complete: all weeks passed.");