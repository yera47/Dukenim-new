import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const root = process.cwd();
const shadow = join(tmpdir(), "dukenim-supabase-field-sales");
rmSync(shadow, { recursive: true, force: true });
mkdirSync(join(shadow, "supabase", "migrations"), { recursive: true });
mkdirSync(join(shadow, "supabase", ".temp"), { recursive: true });
cpSync(join(root, "supabase", "config.toml"), join(shadow, "supabase", "config.toml"));
const projectTemp = join(root, "supabase", ".temp");
if (existsSync(projectTemp)) cpSync(projectTemp, join(shadow, "supabase", ".temp"), { recursive: true });

const listed = spawnSync("npx supabase migration list --linked", { cwd: root, encoding: "utf8", shell: true });
if (listed.status !== 0) throw new Error(listed.stderr || "Unable to read remote migration history");
const stdout = String(listed.stdout ?? "").replace(/\x1b\[[0-9;]*m/g, "");
const output = `${stdout}\n${listed.stderr ?? ""}`.replace(/\x1b\[[0-9;]*m/g, "");
if (process.env.DEBUG_MIGRATION_LIST === "1") console.error(JSON.stringify(output.slice(0, 1200)));
const remoteVersions = new Set();
try {
  const parsed = JSON.parse(stdout.trim());
  for (const migration of parsed.migrations ?? []) if (/^\d{12,14}$/.test(migration.remote ?? "")) remoteVersions.add(migration.remote);
} catch {
  // Older CLIs render a table instead of JSON.
}
for (const line of output.split(/\r?\n/)) {
  const cells = line.split("|").map((cell) => cell.replaceAll("`", "").trim());
  if (cells.length < 2 || !/^\d{12,14}$/.test(cells[1])) continue;
  remoteVersions.add(cells[1]);
}
for (const version of remoteVersions) writeFileSync(join(shadow, "supabase", "migrations", `${version}_remote_history.sql`), "-- Existing remote migration; placeholder used only for isolated CLI history reconciliation.\n");
cpSync(join(root, "supabase", "migrations", "20260928083817_root_field_sales_crm.sql"), join(shadow, "supabase", "migrations", "20260928083817_root_field_sales_crm.sql"));
console.log(shadow);
