"use client";

import { useState } from "react";
import SimStage from "@/components/sim/SimStage";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import type { Camera } from "@/lib/data";
import { ago } from "@/lib/util";

export function CameraDetail({ camera, onClose }: { camera: Camera | null; onClose: () => void }) {
  const [evidence, setEvidence] = useState<string | null>(null);
  const c = camera;

  return (
    <Modal
      open={c !== null}
      onClose={() => {
        setEvidence(null);
        onClose();
      }}
      title={c ? `${c.id} — ${c.location}` : ""}
      subtitle={c ? `${c.type} · ${c.district}` : undefined}
      wide
      footer={
        c && (
          <button
            type="button"
            className="btn"
            onClick={() => setEvidence(evidence ? null : "queued")}
          >
            {evidence ? "Clear evidence flag" : "Flag for evidence review"}
          </button>
        )
      }
    >
      {c && (
        <>
          <SimStage
            seed={c.seed + 1}
            camId={c.id}
            location={c.location}
            district={c.district}
            gps={c.gps}
            hour={c.hour}
            weather={c.weather}
            density={c.density}
            layout={c.pedestrianZone ? "residential" : "road"}
            intersection={c.intersection}
            pedestrianZone={c.pedestrianZone}
            speedLimit={c.speedLimit}
            ai
            aiLabels
            hud={[
              { label: c.id, value: "" },
              { label: c.location.toUpperCase(), value: "" },
              { label: `LIMIT ${c.speedLimit} KM/H`, value: "" },
            ]}
          />
          {evidence && (
            <p className="rounded-[14px] border border-[var(--viz-1)]/30 bg-[var(--viz-1)]/10 px-4 py-3 text-xs text-gold">
              Evidence flag queued. A traffic admin will review the ANPR capture before any notice is
              issued.
            </p>
          )}
          <dl className="kv">
            <dt>Status</dt>
            <dd>
              <StatusBadge status={c.online ? "ONLINE" : "OFFLINE"} />
            </dd>
            <dt>GPS coordinates</dt>
            <dd className="font-mono text-xs">{c.gps}</dd>
            <dt>Camera type</dt>
            <dd>{c.type}</dd>
            <dt>ANPR capable</dt>
            <dd>{c.anpr ? "Yes — plate capture enabled" : "No — video analytics only"}</dd>
            <dt>Speed limit</dt>
            <dd className="font-mono">{c.speedLimit} km/h</dd>
            <dt>Traffic density</dt>
            <dd className="font-mono">{Math.round(c.density * 100)}%</dd>
            <dt>Weather</dt>
            <dd className="capitalize">{c.weather}</dd>
            <dt>Pedestrian zone</dt>
            <dd>{c.pedestrianZone ? "Yes" : "No"}</dd>
            <dt>Junction camera</dt>
            <dd>{c.intersection ? "Yes" : "No"}</dd>
            <dt>Installed</dt>
            <dd className="font-mono">{c.installed}</dd>
            <dt>Firmware</dt>
            <dd className="font-mono">{c.firmware}</dd>
            <dt>Last heartbeat</dt>
            <dd className="font-mono">{ago(c.lastPing)}</dd>
          </dl>
        </>
      )}
    </Modal>
  );
}
