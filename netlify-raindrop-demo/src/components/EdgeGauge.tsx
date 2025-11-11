import React from "react";

/**
 * Semi-circular gauge styled with Aigent-Z tokens.
 * Props:
 *   floorBps: number      // safety floor (fees + gas + safety)
 *   minEdgeBps: number    // your target minimum edge to trade
 *   currentEdgeBps: number// latest observed edge from quotes stream
 */
export default function EdgeGauge({
  floorBps,
  minEdgeBps,
  currentEdgeBps,
  size = 220,
  thickness = 12,
  maxBps, // optional fixed scale; otherwise auto
}: {
  floorBps: number;
  minEdgeBps: number;
  currentEdgeBps: number;
  size?: number;
  thickness?: number;
  maxBps?: number;
}) {
  // Scale: keep it stable & readable
  const vMax = Math.max(floorBps, minEdgeBps, currentEdgeBps, 5); // never below 5 bps
  const scale = Math.max(maxBps ?? Math.ceil(vMax * 1.3), 10);    // pad 30%

  // Geometry
  const r = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startDeg = 180; // left
  const endDeg = 0;     // right

  const toRatio = (v: number) => Math.max(0, Math.min(1, v / scale));
  const toAngle = (t: number) => 180 - 180 * t; // 0..1 -> 180..0 (deg)
  const polar = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arcPath = (t: number) => {
    const a0 = startDeg;
    const a1 = toAngle(t);
    const p0 = polar(a0);
    const p1 = polar(a1);
    const large = t > 0.5 ? 1 : 0;
    // sweep=1 (cw) from 180 -> 0
    return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
  };

  const tFloor = toRatio(floorBps);
  const tMin = toRatio(minEdgeBps);
  const tNow = toRatio(currentEdgeBps);

  // Needle
  const needleDeg = toAngle(tNow);
  const tip = polar(needleDeg);
  const inner = { x: cx + (r - thickness * 1.3) * Math.cos((needleDeg * Math.PI) / 180),
                  y: cy + (r - thickness * 1.3) * Math.sin((needleDeg * Math.PI) / 180) };

  // Status color based on thresholds (needle reflects this)
  const status =
    currentEdgeBps >= minEdgeBps ? "success" :
    currentEdgeBps >= floorBps   ? "warn"    : "error";
  const statusColor =
    status === "success" ? "rgb(var(--success))" :
    status === "warn"    ? "rgb(var(--warn))"    :
                           "rgb(var(--error))";

  return (
    <div style={{ width: size, userSelect: "none" }} aria-label="Edge Gauge">
      <svg width={size} height={size / 2 + thickness} viewBox={`0 0 ${size} ${size/2 + thickness}`}>
        {/* Track */}
        <path d={arcPath(1)} stroke="rgba(255,255,255,.15)" strokeWidth={thickness} fill="none" strokeLinecap="round" />

        {/* Floor band (muted) */}
        <path d={arcPath(tFloor)} stroke={`rgb(var(--muted))`} strokeWidth={thickness} fill="none" strokeLinecap="round" />

        {/* Target (min edge) overlay – dashed brand */}
        <path d={arcPath(tMin)} stroke={`rgb(var(--brand))`} strokeWidth={thickness * 0.5} fill="none"
              strokeDasharray="6 6" strokeLinecap="round" />

        {/* Needle (status color reflects current vs thresholds) */}
        <line x1={inner.x} y1={inner.y} x2={tip.x} y2={tip.y}
              stroke={statusColor} strokeWidth={3} strokeLinecap="round" />
        {/* Needle hub */}
        <circle cx={cx} cy={cy} r={thickness * 0.55} fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.25)" />
        {/* Tip status dot */}
        <circle cx={tip.x} cy={tip.y} r={thickness * 0.45} fill={statusColor} stroke="rgba(255,255,255,.35)" />

        {/* Ticks (0, floor, min, max) */}
        {[
          { v: 0, label: "0" },
          { v: floorBps, label: "floor" },
          { v: minEdgeBps, label: "target" },
          { v: scale, label: `${scale} bps` },
        ].map((t, i) => {
          const a = toAngle(toRatio(t.v));
          const pO = polar(a);
          const pI = {
            x: cx + (r - thickness * 0.7) * Math.cos((a * Math.PI) / 180),
            y: cy + (r - thickness * 0.7) * Math.sin((a * Math.PI) / 180),
          };
          return (
            <g key={i} aria-hidden="true">
              <line x1={pI.x} y1={pI.y} x2={pO.x} y2={pO.y}
                    stroke="rgba(255,255,255,.35)" strokeWidth={1} />
            </g>
          );
        })}
      </svg>

      {/* Legend / numbers */}
      <div className="ui-row ui-gap-3 ui-text-xs ui-mt-2" style={{ justifyContent: "space-between" }}>
        <div className="ui-row ui-gap-1">
          <span style={{ width: 10, height: 10, background: "rgb(var(--muted))", borderRadius: 999 }} />
          <span>Floor</span>
          <strong className="ui-mono">{floorBps.toFixed(2)} bps</strong>
        </div>
        <div className="ui-row ui-gap-1">
          <span style={{ width: 10, height: 10, background: "rgb(var(--brand))", borderRadius: 999 }} />
          <span>Target</span>
          <strong className="ui-mono">{minEdgeBps.toFixed(2)} bps</strong>
        </div>
        <div className="ui-row ui-gap-1">
          <span style={{ width: 10, height: 10, background: statusColor, borderRadius: 999 }} />
          <span>Now</span>
          <strong className="ui-mono">{currentEdgeBps.toFixed(2)} bps</strong>
        </div>
      </div>
    </div>
  );
}
