export class RequestTimeoutError extends Error {
  constructor() { super("request_timeout"); this.name = "RequestTimeoutError"; }
}

export function boundedRequest<T>(request: PromiseLike<T>, timeoutMs = 12_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RequestTimeoutError()), timeoutMs);
  });
  return Promise.race([Promise.resolve(request), timeout]).finally(() => { if (timer) clearTimeout(timer); });
}
