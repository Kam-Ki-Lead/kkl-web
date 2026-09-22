"use client";

import { useSyncExternalStore } from "react";

/**
 * True once this component has hydrated on the client, false during server
 * render and the first client pass.
 *
 * Used for progressive enhancement: render the control that works without
 * JavaScript, then stand it down once the enhanced path is live.
 *
 * `useSyncExternalStore` rather than `useState` plus an effect. The effect
 * version calls setState during the effect body, which cascades a render and is
 * what React's own lint rule warns about; this reads a constant per environment
 * instead — `false` from the server snapshot, `true` from the client one — and
 * React reconciles it as part of hydration.
 */
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
