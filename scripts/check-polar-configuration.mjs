// Read-only release check. Never prints credentials, customer data or response bodies.
const token = process.env.POLAR_ACCESS_TOKEN;
const names = ["POLAR_BASIC_MONTHLY_PRODUCT_ID", "POLAR_BASIC_ANNUAL_PRODUCT_ID", "POLAR_STANDARD_MONTHLY_PRODUCT_ID", "POLAR_STANDARD_ANNUAL_PRODUCT_ID"];
if (!token) { console.error("Polar access token unavailable to this runtime"); process.exit(1); }
let failed = false;
for (const name of names) {
  const id = process.env[name];
  if (!id) { console.error(`${name}: missing`); failed = true; continue; }
  try {
    const response = await fetch(`https://api.polar.sh/v1/products/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
    console.log(`${name}: HTTP ${response.status}`);
    if (!response.ok) failed = true;
  } catch { console.error(`${name}: request failed`); failed = true; }
}
process.exitCode = failed ? 1 : 0;
