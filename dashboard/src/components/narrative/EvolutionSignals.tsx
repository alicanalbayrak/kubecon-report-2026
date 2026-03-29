import type { EvolutionSignal } from "../../lib/enriched-types";

interface Props {
  signals: EvolutionSignal[];
}

export default function EvolutionSignals({ signals }: Props) {
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Evolution Signals</h2>
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {signals.map((signal) => (
          <div key={signal.signal} className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{signal.signal}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                From: {signal.from_state.length > 60 ? signal.from_state.slice(0, 60) + "..." : signal.from_state}
              </span>
              <span>&rarr;</span>
              <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                To: {signal.to_state.length > 60 ? signal.to_state.slice(0, 60) + "..." : signal.to_state}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
