import ChainIcon from "./ChainIcon";

type Row = {
  chain: string;
  pair: string;
  buy_venue?: string;
  sell_venue?: string;
  bid?: number;
  ask?: number;
  floor_bps: number;
  edge_bps: number;
  ts: string;
};

export default function QuotesTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-auto rounded-2xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left p-2">Pair</th>
            <th className="text-left p-2">Chain</th>
            <th className="text-left p-2">Buy @</th>
            <th className="text-left p-2">Sell @</th>
            <th className="text-right p-2">Bid</th>
            <th className="text-right p-2">Ask</th>
            <th className="text-right p-2">Floor (bps)</th>
            <th className="text-right p-2">Edge (bps)</th>
            <th className="text-right p-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50">
              <td className="p-2">{r.pair}</td>
              <td className="p-2">
                <div className="flex items-center gap-2">
                  <ChainIcon chain={r.chain} />
                  <span className="capitalize">{r.chain}</span>
                </div>
              </td>
              <td className="p-2">{r.buy_venue || "-"}</td>
              <td className="p-2">{r.sell_venue || "-"}</td>
              <td className="p-2 text-right">
                ${(r.bid ?? 0).toFixed(5)}
              </td>
              <td className="p-2 text-right">
                ${(r.ask ?? 0).toFixed(5)}
              </td>
              <td className="p-2 text-right">
                {(r.floor_bps ?? 0).toFixed(2)}
              </td>
              <td
                className={`p-2 text-right ${
                  (r.edge_bps ?? 0) > 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {(r.edge_bps ?? 0).toFixed(2)}
              </td>
              <td className="p-2 text-right">
                {new Date(r.ts).toLocaleTimeString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
