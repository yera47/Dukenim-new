import { HTTPClient, Polar, type Fetcher } from "@polar-sh/sdk";

export const POLAR_API_VERSION = "2026-04" as const;
export type PolarEnvironment = "sandbox" | "production";

export function createVersionedPolarHttpClient(fetcher?: Fetcher): HTTPClient {
  const httpClient = new HTTPClient(fetcher ? { fetcher } : undefined);
  httpClient.addHook("beforeRequest", request => {
    const versionedRequest = new Request(request);
    versionedRequest.headers.set("Polar-Version", POLAR_API_VERSION);
    return versionedRequest;
  });
  return httpClient;
}

export function createVersionedPolarClient(
  accessToken: string,
  server: PolarEnvironment,
  fetcher?: Fetcher,
): Polar {
  return new Polar({
    accessToken,
    server,
    httpClient: createVersionedPolarHttpClient(fetcher),
  });
}
