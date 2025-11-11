import React from "react";

export default function CaptureSparkline({ points }: { points: number[] }) {
  const width = 320;
  const height = 80;
  const max = Math.max(1, ...points, 5);

  if (points.length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow p-4">
        <div className="text-sm font-medium mb-2">Capture (bps)</div>
        <div className="h-20 flex items-center justify-center text-gray-400">
          No data yet...
        </div>
      </div>
    );
  }

  const path =
    points.length > 1
      ? "M " +
        points
          .map((v, i) => {
            const x = (i / (points.length - 1)) * width;
            const y = height - (v / max) * height;
            return `${x},${y}`;
          })
          .join(" L ")
      : `M ${width / 2},${height - (points[0] / max) * height}`;

  return (
    <div className="bg-white rounded-2xl shadow p-3">
      <div className="text-sm font-medium mb-2">Capture (bps per fill)</div>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="rounded"
      >
        <defs>
          <linearGradient id="captureGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: "rgb(16, 185, 129)", stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: "rgb(16, 185, 129)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {points.length > 1 && (
          <path
            d={`${path} L ${width},${height} L 0,${height} Z`}
            fill="url(#captureGradient)"
          />
        )}
        <polyline
          fill="none"
          stroke="rgb(16, 185, 129)"
          strokeWidth="2"
          points={points
            .map((v, i) => {
              const x = (i / Math.max(1, points.length - 1)) * width;
              const y = height - (v / max) * height;
              return `${x},${y}`;
            })
            .join(" ")}
        />
      </svg>
      <div className="text-xs text-gray-600 mt-1">
        Last: <b className="text-emerald-600">{points[points.length - 1]?.toFixed(2) || "0"}</b> bps
        {" · "}
        Avg: <b>{(points.reduce((a, b) => a + b, 0) / points.length || 0).toFixed(2)}</b> bps
      </div>
    </div>
  );
}
