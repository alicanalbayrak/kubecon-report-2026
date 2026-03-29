import { useState } from "react";
import type { MetaTheme } from "../../lib/enriched-types";

interface Props {
  themes: MetaTheme[];
}

const MATURITY_STYLES: Record<string, string> = {
  emerging: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  growing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  established: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

function ThemeCard({ theme }: { theme: MetaTheme }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {theme.name}
        </h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${MATURITY_STYLES[theme.maturity] ?? MATURITY_STYLES.growing}`}>
          {theme.maturity}
        </span>
      </div>
      <p className={`text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
        {theme.description}
      </p>
      {theme.description.length > 150 && (
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-blue-600 dark:text-blue-400 mt-1 hover:underline">
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
      <div className="flex flex-wrap gap-1 mt-3">
        {theme.evidence_tracks.map((track) => (
          <span key={track} className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
            {track}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MetaThemes({ themes }: Props) {
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Meta-Themes</h2>
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {themes.map((theme) => (
          <ThemeCard key={theme.name} theme={theme} />
        ))}
      </div>
    </div>
  );
}
