"use client";

import { useEffect, useRef, useState } from "react";
import PTMSim, { type SimDetection, type SimOptions, type SimStats } from "@/lib/sim/traffic-sim";

export interface SimStageProps extends SimOptions {
  className?: string;
  hud?: { label: string; value: string }[];
  onStats?: (stats: SimStats) => void;
  onDetection?: (detections: SimDetection[]) => void;
  paused?: boolean;
  onCapture?: (dataUrl: string) => void;
}

export default function SimStage({
  className,
  hud = [],
  onStats,
  onDetection,
  paused,
  onCapture,
  ...options
}: SimStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<PTMSim | null>(null);
  const [ready, setReady] = useState(false);

  const optsKey = JSON.stringify(options);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sim = new PTMSim(canvas, JSON.parse(optsKey) as SimOptions);
    simRef.current = sim;
    setReady(true);
    sim.start();
    return () => {
      sim.destroy();
      simRef.current = null;
    };
  }, [optsKey]);

  useEffect(() => {
    if (paused === undefined) return;
    if (paused) simRef.current?.stop();
    else simRef.current?.start();
  }, [paused]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      const sim = simRef.current;
      if (!sim) return;
      onStats?.(sim.getStats());
      onDetection?.(sim.getDetections());
    }, 1000);
    return () => window.clearInterval(id);
  }, [ready, onStats, onDetection]);

  return (
    <div className={className ?? "sim-stage"}>
      <canvas ref={canvasRef} />
      {hud.length > 0 && (
        <div className="sim-hud">
          {hud.map((h) => (
            <span key={h.label}>
              {h.label} {h.value}
            </span>
          ))}
        </div>
      )}
      {onCapture && (
        <button
          type="button"
          className="absolute bottom-3 right-3 btn btn-ghost text-[0.7rem]"
          onClick={() => {
            const url = simRef.current?.capture();
            if (url) onCapture(url);
          }}
        >
          Capture evidence
        </button>
      )}
    </div>
  );
}

export function useSimStage() {
  const ref = useRef<{ capture: () => string | undefined } | null>(null);
  return ref;
}
