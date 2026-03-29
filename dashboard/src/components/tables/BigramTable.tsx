import { useState, useMemo } from "react";
import type { Event, FrequencyEntry } from "../../lib/types";
import { extractBigrams } from "../../lib/text-analysis";

interface BigramTableProps {
  events: Event[];
}

type SortKey = "term" | "count";
type SortDir = "asc" | "desc";

function sortIndicator(column: SortKey, sortKey: SortKey, sortDir: SortDir): string {
  if (column !== sortKey) return " \u2195";
  return sortDir === "asc" ? " \u2191" : " \u2193";
}

export default function BigramTable({ events }: BigramTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const top30 = useMemo(() => {
    return extractBigrams(events).slice(0, 30);
  }, [events]);

  const sortedData = useMemo(() => {
    const data = [...top30];
    data.sort((a: FrequencyEntry, b: FrequencyEntry) => {
      if (sortKey === "term") {
        const cmp = a.term.localeCompare(b.term);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const cmp = a.count - b.count;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [top30, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "count" ? "desc" : "asc");
    }
  }

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
      <h2 className="text-lg font-semibold p-4 text-gray-900 dark:text-gray-100">
        Top Bigram Phrases
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
              <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400 w-16">
                #
              </th>
              <th
                className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200"
                onClick={() => handleSort("term")}
              >
                Bigram{sortIndicator("term", sortKey, sortDir)}
              </th>
              <th
                className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 w-24"
                onClick={() => handleSort("count")}
              >
                Count{sortIndicator("count", sortKey, sortDir)}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No data available
                </td>
              </tr>
            ) : (
              sortedData.map((entry, i) => (
                <tr
                  key={entry.term}
                  className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30"
                >
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-500">
                    {i + 1}
                  </td>
                  <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                    {entry.term}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100 font-mono">
                    {entry.count}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
