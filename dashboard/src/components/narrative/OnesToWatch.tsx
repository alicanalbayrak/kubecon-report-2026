import type { OneToWatch } from "../../lib/enriched-types";

interface Props {
  items: OneToWatch[];
}

export default function OnesToWatch({ items }: Props) {
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Ones to Watch</h2>
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {items.map((item) => (
          <div key={item.name} className="border-l-4 border-cyan-500 pl-4 py-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">{item.why}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">{item.current_state}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
