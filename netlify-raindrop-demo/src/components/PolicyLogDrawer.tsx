import React from "react";

type LogEntry = {
  ts: string;
  action: string;
  details?: any;
};

export default function PolicyLogDrawer({ logs }: { logs: LogEntry[] }) {
  return (
    <div className="bg-white rounded-2xl shadow p-3 max-h-64 overflow-y-auto">
      <div className="text-sm font-medium mb-2">Policy Log</div>
      {logs.length === 0 ? (
        <div className="text-xs text-gray-400 text-center py-4">
          No policy actions yet
        </div>
      ) : (
        <ul className="space-y-1.5">
          {logs.map((l, i) => (
            <li key={i} className="flex justify-between text-xs py-1 px-2 hover:bg-gray-50 rounded">
              <span className="font-medium text-gray-700">{l.action}</span>
              <span className="text-gray-500">
                {new Date(l.ts).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
