// Explicit opt-in release probe; never prints checkout URLs, credentials or response bodies.
if (process.env.DUKENIM_VERIFY_POLAR === "1") {
  const { Polar } = await import("@polar-sh/sdk");
  const token = process.env.POLAR_ACCESS_TOKEN;
  if (!token) throw new Error("Polar release check: access token missing");
  const client = new Polar({ accessToken: token, server: process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production" });
  for (const name of ["POLAR_BASIC_MONTHLY_PRODUCT_ID", "POLAR_BASIC_ANNUAL_PRODUCT_ID", "POLAR_STANDARD_MONTHLY_PRODUCT_ID", "POLAR_STANDARD_ANNUAL_PRODUCT_ID"]) {
    const product = process.env[name];
    if (!product) throw new Error(`Polar release check: ${name} missing`);
    try {
      await client.checkouts.create({ products: [product], metadata: { purpose: "dukenim_release_configuration_check" } });
      console.log(`Polar release check: ${name} checkout creation passed`);
    } catch {
      throw new Error(`Polar release check: ${name} checkout rejected; verify merchant, token and product organization`);
    }
  }
}
