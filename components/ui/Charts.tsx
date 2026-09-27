"use client";

import { useId } from "react";
import { num } from "@/lib/util";

export interface LineSeries {
  label: string;
  data: number[];
  color?: string;
}

export interface LineChartProps {
  series: LineSeries[];
  labels?: string[];
  height?: number;
  area?: boolean;
  grid?: boolean;
  colors?: string[];
}

const DEFAULT_COLORS = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-7)"];

export function LineChart({
  series,
  labels = [],
  height = 220,
  area = true,
  grid = true,
  colors = DEFAULT_COLORS,
}: LineChartProps) {
  const uid = useId().replace(/:/g, "");
  const W = 760;
  const H = height;
  const padL = 52;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const all = series.flatMap((s) => s.data);
  const max = Math.max(1, ...all);
  const n = series[0]?.data.length ?? 1;
  const sx = (i: number) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
  const sy = (v: number) => H - padB - (v / (max || 1)) * (H - padT - padB);

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Trend chart">
        <defs>
          {series.map((s, si) => (
            <linearGradient key={s.label} id={`${uid}-g${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? colors[si % colors.length]} stopOpacity="0.32" />
              <stop offset="100%" stopColor={s.color ?? colors[si % colors.length]} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {grid &&
          Array.from({ length: 5 }, (_, g) => {
            const y = padT + (g / 4) * (H - padT - padB);
            return (
              <g key={g}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--stroke)" />
                <text
                  x={padL - 8}
                  y={y + 4}
                  fill="var(--muted-2)"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="var(--mono)"
                >
                  {num(Math.round((max / 4) * (4 - g)))}
                </text>
              </g>
            );
          })}

        {series.map((s, si) => {
          const color = s.color ?? colors[si % colors.length];
          const d = s.data.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
          const last = s.data[s.data.length - 1];
          return (
            <g key={s.label}>
              {area && (
                <path
                  d={`${d} L${sx(s.data.length - 1).toFixed(1)} ${H - padB} L${sx(0).toFixed(1)} ${H - padB} Z`}
                  fill={`url(#${uid}-g${si})`}
                />
              )}
              <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
              {last !== undefined && (
                <circle cx={sx(s.data.length - 1)} cy={sy(last)} r="3.5" fill={color} />
              )}
            </g>
          );
        })}

        {labels.length > 0 &&
          labels.map((label, i) => {
            const step = Math.ceil(labels.length / 8);
            if (i % step !== 0 && i !== labels.length - 1) return null;
            return (
              <text
                key={`${label}-${i}`}
                x={sx(i)}
                y={H - 8}
                fill="var(--muted-2)"
                fontSize="10"
                textAnchor="middle"
                fontFamily="var(--mono)"
              >
                {label}
              </text>
            );
          })}
      </svg>

      <div className="chart-legend">
        {series.map((s, si) => (
          <span key={s.label}>
            <i style={{ background: s.color ?? colors[si % colors.length] }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface BarChartProps {
  items: { label: string; value: number; color?: string }[];
  height?: number;
  horizontal?: boolean;
}

export function BarChart({ items, height = 240, horizontal }: BarChartProps) {
  const max = Math.max(1, ...items.map((i) => i.value));

  if (horizontal) {
    return (
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="text-muted">{item.label}</span>
              <span className="font-mono text-text">{num(item.value)}</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${(item.value / max) * 100}%`,
                  background: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const W = 760;
  const padB = 46;
  const padT = 14;
  const bw = (W - 20) / Math.max(1, items.length);

  return (
    <div className="chart-box">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label="Bar chart">
        {Array.from({ length: 4 }, (_, g) => {
          const y = (g / 3) * (height - padB - padT) + padT;
          return (
            <line
              key={g}
              x1="10"
              x2={W - 10}
              y1={y}
              y2={y}
              stroke="var(--stroke)"
            />
          );
        })}
        {items.map((item, i) => {
          const h = (item.value / max) * (height - padB - padT);
          const x = 10 + i * bw + bw * 0.16;
          const w = bw * 0.68;
          const y = height - padB - h;
          return (
            <g key={item.label}>
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx="4"
                fill={item.color ?? "url(#ptm-bar)"}
              />
              <text
                x={x + w / 2}
                y={y - 6}
                fill="var(--text)"
                fontSize="9.5"
                textAnchor="middle"
                fontFamily="var(--mono)"
              >
                {num(item.value)}
              </text>
              <text
                x={x + w / 2}
                y={height - padB + 16}
                fill="var(--muted)"
                fontSize="9.5"
                textAnchor="middle"
                fontFamily="var(--mono)"
              >
                {item.label}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="ptm-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--viz-1)" stopOpacity="0.75" />
            <stop offset="100%" stopColor="var(--viz-1)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  segments,
  size = 170,
  center,
  sub,
}: {
  segments: DonutSegment[];
  size?: number;
  center?: string;
  sub?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const S = size;
  const R = S / 2 - 8;
  const C = S / 2;
  const stroke = 14;
  const circumference = 2 * Math.PI * R;
  const arcs: { seg: DonutSegment; dash: number; offset: number }[] = [];
  let prior = 0;
  for (const seg of segments) {
    const dash = (seg.value / total) * circumference;
    arcs.push({ seg, dash, offset: -prior });
    prior += dash;
  }

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} role="img" aria-label="Breakdown">
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--stroke)" strokeWidth={stroke} />
        {arcs.map(({ seg, dash, offset }, i) => (
          <circle
            key={`${seg.label}-${i}`}
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${C} ${C})`}
            strokeLinecap="butt"
          />
        ))}
        {center && (
          <text
            x={C}
            y={C + 2}
            textAnchor="middle"
            fill="var(--text)"
            fontSize="18"
            fontWeight="800"
            fontFamily="var(--mono)"
          >
            {center}
          </text>
        )}
        {sub && (
          <text x={C} y={C + 20} textAnchor="middle" fill="var(--muted-2)" fontSize="9" letterSpacing="0.14em">
            {sub}
          </text>
        )}
      </svg>
      <ul className="flex flex-col gap-2.5">
        {segments.map((seg, i) => (
          <li key={`${seg.label}-${i}`} className="flex items-center gap-3 text-sm">
            <i
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: seg.color }}
              aria-hidden="true"
            />
            <span className="text-muted">{seg.label}</span>
            <span className="font-mono text-text">
              {num(seg.value)}
              <span className="ml-2 text-[0.68rem] text-muted-2">
                {Math.round((seg.value / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({
  data,
  color = "var(--viz-1)",
  height = 34,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const W = 200;
  const max = Math.max(1, ...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const sx = (i: number) => (i / Math.max(1, data.length - 1)) * W;
  const sy = (v: number) => height - ((v - min) / span) * (height - 6) - 3;
  const d = data.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");

  return (
    <svg className="spark" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" role="img">
      <path d={`${d} L${W} ${height} L0 ${height} Z`} fill={color} opacity="0.12" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

export function BarMeter({ value, tone }: { value: number; tone?: "green" | "red" | "blue" }) {
  return (
    <div className="bar-track w-24">
      <div
        className={tone ? `bar-fill ${tone}` : "bar-fill"}
        style={{ width: `${Math.min(100, Math.max(2, value))}%` }}
      />
    </div>
  );
}
