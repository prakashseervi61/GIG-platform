import { hashPassword } from "../src/utils/password";
import { pool } from "../src/db/pool";

async function main() {
  const h = await hashPassword("admin@12345");
  const r = await pool.query(
    "UPDATE users SET password_hash = $1 WHERE role IN ('coop_admin','federation_admin') RETURNING email",
    [h]
  );
  console.log("updated:", r.rows.map((x) => x.email).join(", "));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});