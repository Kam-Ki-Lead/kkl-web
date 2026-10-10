/**
 * The remembered city, as an external store.
 *
 * `localStorage` is exactly what `useSyncExternalStore` is for: state that
 * lives outside React, can change without React knowing, and has a different
 * value on the server than in the browser. Reading it in an effect instead
 * would work, but it makes the first client render disposable and the React
 * Compiler is right to object.
 *
 * It subscribes to `storage` too, so choosing a city in one tab updates the
 * header in the others.
 */

import { CITY_STORAGE_KEY } from "@/lib/domain/site-header";

const listeners = new Set<() => void>();

function announce() {
  for (const listener of listeners) listener();
}

export function subscribeToCity(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab wrote the key. `storage` does not fire in the tab that wrote.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CITY_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** A string or null — a primitive, so React can compare it by identity. */
export function readStoredCity(): string | null {
  try {
    return window.localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    // Private browsing, or site data blocked.
    return null;
  }
}

/** The server has no storage, so it renders the default and says so. */
export function readStoredCityOnServer(): string | null {
  return null;
}

export function writeStoredCity(id: string): void {
  try {
    window.localStorage.setItem(CITY_STORAGE_KEY, id);
  } catch {
    // The choice holds for this page view only.
  }
  announce();
}
