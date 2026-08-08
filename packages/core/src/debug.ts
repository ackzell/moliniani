type MaybeDebugWindow = Window & {
  __MOLINIANI_DEBUG?: boolean;
  __MOLINIANI_DEBUG__?: boolean;
};

function hasDebugLocalStorageFlag(): boolean {
  try {
    return window.localStorage?.getItem("moliniani:debug") === "1";
  } catch {
    return false;
  }
}

export function isMolinianiDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as MaybeDebugWindow;
  return Boolean(w.__MOLINIANI_DEBUG || w.__MOLINIANI_DEBUG__ || hasDebugLocalStorageFlag());
}

export function molinianiDebugLog(message: string, payload?: unknown): void {
  if (!isMolinianiDebugEnabled()) return;
  if (payload === undefined) {
    console.warn(`[moliniani] ${message}`);
    return;
  }
  console.warn(`[moliniani] ${message}`, payload);
}
