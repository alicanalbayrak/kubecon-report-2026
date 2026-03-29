import type { UnexpectedAppearance } from "../../lib/enriched-types";

interface Props {
  items: UnexpectedAppearance[];
}

export default function UnexpectedAppearances({ items }: Props) {
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Unexpected Appearances</h2>
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {items.map((item) => (
          <div key={item.technology} className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.technology}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.significance}</p>
            <div className="flex flex-wrap gap-1">
              {item.unexpected_tracks.map((track) => (
                <span key={track} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  {track}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
