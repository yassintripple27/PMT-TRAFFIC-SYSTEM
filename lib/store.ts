"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_RULES, ROLES, type AuditEntry, type Officer, type ViolationRule } from "@/lib/data";
import { uid } from "@/lib/util";

const KEY = "ptm.";
const cache = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function parse<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEY + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function read<T>(key: string, fallback: T): T {
  if (!cache.has(key)) cache.set(key, parse(key, fallback));
  return cache.get(key) as T;
}

function write<T>(key: string, value: T) {
  cache.set(key, value);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY + key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }
  listeners.get(key)?.forEach((cb) => cb());
}

function subscribe(key: string, cb: () => void) {
  const set = listeners.get(key) ?? new Set();
  set.add(cb);
  listeners.set(key, set);
  return () => {
    set.delete(cb);
  };
}

export function useLocalState<T>(key: string, initial: T) {
  const value = useSyncExternalStore(
    useCallback((cb: () => void) => subscribe(key, cb), [key]),
    useCallback(() => read(key, initial), [key, initial]),
    useCallback(() => initial, [initial]),
  );

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(read(key, initial)) : next;
      write(key, resolved);
    },
    [key, initial],
  );

  return [value, update] as const;
}

export interface Session {
  user: Officer;
  role: string;
  signedInAt: number;
}

export function useSession() {
  const [session, setSession] = useLocalState<Session | null>("session", null);

  const role = useMemo(
    () => (session ? ROLES.find((r) => r.key === session.role) : null),
    [session],
  );

  const can = useCallback(
    (perm: string) => (role ? role.perms.includes("*") || role.perms.includes(perm) : false),
    [role],
  );

  const signIn = useCallback(
    (user: Officer) => {
      const next: Session = { user, role: user.role, signedInAt: Date.now() };
      setSession(next);
      return next;
    },
    [setSession],
  );

  const signOut = useCallback(() => setSession(null), [setSession]);

  return { session, role, can, signIn, signOut };
}

export function useRules() {
  const [rules, setRules] = useLocalState<ViolationRule[]>("rules", DEFAULT_RULES);

  const update = useCallback(
    (key: string, patch: Partial<ViolationRule>) => {
      setRules((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    },
    [setRules],
  );

  const reset = useCallback(() => setRules(DEFAULT_RULES), [setRules]);

  return { rules, setRules, update, reset };
}

export function useAudit() {
  const [log, setLog] = useLocalState<AuditEntry[]>("audit", []);

  const record = useCallback(
    (action: string, detail: Record<string, unknown> = {}, session?: Session | null) => {
      const entry: AuditEntry = {
        id: uid("AUD"),
        ts: Date.now(),
        action,
        actor: session?.user
          ? `${session.user.name} (${session.user.officerId})`
          : "UNAUTHENTICATED",
        role: session?.role ?? "GUEST",
        detail,
      };
      setLog((prev) => [entry, ...prev].slice(0, 300));
      return entry;
    },
    [setLog],
  );

  return { log, record };
}

export interface PaymentRecord {
  status: "PENDING APPROVAL" | "APPROVED" | "REJECTED";
  method: string;
  reference: string;
  amount: number;
  ts: number;
  officer: string;
}

export function usePayments() {
  const [payments, setPayments] = useLocalState<Record<string, PaymentRecord>>("payments", {});
  return { payments, setPayments };
}
