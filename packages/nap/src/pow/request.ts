export interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export function createPending<T>(
  map: Map<string, PendingRequest<T>>,
  timeoutMessage: string,
): { id: string; promise: Promise<T> } {
  const id = crypto.randomUUID();
  const promise = new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (map.delete(id)) reject(new Error(timeoutMessage));
    }, 30_000);
    map.set(id, { resolve, reject, timeout });
  });
  return { id, promise };
}

export function resolvePending<T>(
  map: Map<string, PendingRequest<T>>,
  id: string,
  value: T,
): void {
  const pending = map.get(id);
  if (!pending) return;
  map.delete(id);
  clearTimeout(pending.timeout);
  pending.resolve(value);
}

export function rejectPending<T>(
  map: Map<string, PendingRequest<T>>,
  id: string,
  error: string | undefined,
  fallback: string,
): void {
  const pending = map.get(id);
  if (!pending) return;
  map.delete(id);
  clearTimeout(pending.timeout);
  pending.reject(new Error(error ?? fallback));
}

interface RejectablePending {
  timeout: ReturnType<typeof setTimeout>;
  reject: (reason: Error) => void;
}

interface PendingMap {
  values(): Iterable<RejectablePending>;
  clear(): void;
}

export function rejectAllPending(maps: PendingMap[], reason: Error): void {
  for (const map of maps) {
    for (const pending of map.values()) {
      clearTimeout(pending.timeout);
      pending.reject(reason);
    }
    map.clear();
  }
}
