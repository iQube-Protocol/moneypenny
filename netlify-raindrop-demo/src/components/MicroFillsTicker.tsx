import React from "react";
import ChainIcon from "./ChainIcon";

type Fill = {
  ts: string;
  side: "BUY" | "SELL";
  qty_qct: number;
  price_usdc: number;
  venue?: string;
  chain?: string;
  pair?: string;
};

export default function MicroFillsTicker({ fills }: { fills: Fill[] }) {
  return (
    <div className="h-64 overflow-hidden bg-white rounded-2xl shadow p-2">
      <div className="text-sm font-medium px-1 pb-2">Micro Fills</div>
      <div className="space-y-1 h-52 overflow-y-auto">
        {fills.slice(-20).reverse().map((f, i) => (
          <div
            key={i}
            className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                f.side === "BUY"
                  ? "bg-emerald-200 text-emerald-800"
                  : "bg-rose-200 text-rose-800"
              }`}
            >
              {f.side}
            </span>
            {f.chain && (
              <span className="flex items-center gap-1">
                <ChainIcon chain={f.chain} />
              </span>
            )}
            <span className="font-mono">{f.qty_qct.toFixed(2)} Q¢</span>
            <span className="font-mono text-gray-600">@ ${f.price_usdc.toFixed(5)}</span>
            {f.venue && (
              <span className="text-gray-400 text-xs">{f.venue}</span>
            )}
            <span className="text-gray-500">
              {new Date(f.ts).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {fills.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            Waiting for fills...
          </div>
        )}
      </div>
    </div>
  );
}
