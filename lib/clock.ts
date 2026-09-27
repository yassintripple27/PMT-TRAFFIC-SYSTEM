"use client";

import { useSyncExternalStore } from "react";
import { stamp } from "@/lib/util";

const listeners = new Set<() => void>();
let snapshot = "";
let timer: number | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (timer === null) {
    snapshot = stamp();
    timer = window.setInterval(() => {
      snapshot = stamp();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => "";

export function useClock() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
