"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/util";

export interface ToolbarProps {
  children?: ReactNode;
  className?: string;
}

export function Toolbar({ children, className }: ToolbarProps) {
  return <div className={cx("toolbar", className)}>{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cx("search-bar", className)}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <path d="M10 4a6 6 0 105.2 9l4.3 4.3 1.4-1.4L16.6 11.6A6 6 0 0010 4zm0 2a4 4 0 110 8 4 4 0 010-8z" />
      </svg>
      <input
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label?: string;
  className?: string;
}) {
  return (
    <select
      className={cx("input", className)}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={cx("btn-group", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={value === opt.value ? "active" : undefined}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; badge?: number }[];
}) {
  return (
    <div className="tabbar">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={value === opt.value ? "active" : undefined}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
          {typeof opt.badge === "number" && opt.badge > 0 && (
            <span className="ml-2 font-mono text-[0.62rem] opacity-70">{opt.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
