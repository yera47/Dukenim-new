// Anonymous, read-only smoke checks. Never uses browser cookies or user secrets.
const base = process.argv[2] ?? 'https://www.dukenim.kz';
const paths = ['/admin', '/root', '/admin/ai-studio', '/store-preview'];
for (const path of paths) {
  for (const spoof of [false, true]) {
    const response = await fetch(new URL(path, base), {
      redirect: 'manual',
      headers: spoof ? { 'x-middleware-subrequest': 'middleware:middleware:middleware:middleware:middleware' } : {},
      signal: AbortSignal.timeout(15000),
    });
    const location = response.headers.get('location');
    if (response.status !== 307 || !location || new URL(location, base).pathname !== '/login') {
      throw new Error(`${path} spoof=${spoof}: unexpected ${response.status}`);
    }
    if (!response.headers.get('cache-control')?.includes('no-store')) throw new Error(`${path}: missing no-store`);
    console.log(`PASS ${path} spoof=${spoof}: login required, no-store`);
    await response.body?.cancel();
  }
}
