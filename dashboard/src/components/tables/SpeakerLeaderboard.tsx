import { useState, useMemo } from "react";
import type { Event, SpeakerEntry } from "../../lib/types";
import { useFilter } from "../../lib/filters";

interface SpeakerLeaderboardProps {
  events: Event[];
}

type SortKey = "name" | "company" | "sessionCount" | "tracks";
type SortDir = "asc" | "desc";

function sortIndicator(column: SortKey, sortKey: SortKey, sortDir: SortDir): string {
  if (column !== sortKey) return " \u2195";
  return sortDir === "asc" ? " \u2191" : " \u2193";
}

export default function SpeakerLeaderboard({ events }: SpeakerLeaderboardProps) {
  const { dispatch } = useFilter();
  const [sortKey, setSortKey] = useState<SortKey>("sessionCount");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const top30 = useMemo(() => {
    const speakerMap = new Map<
      string,
      { company: string; sessionCount: number; tracks: Set<string> }
    >();

    for (const event of events) {
      for (const speaker of event.speakers) {
        const existing = speakerMap.get(speaker.name);
        if (existing) {
          existing.sessionCount++;
          existing.tracks.add(event.type);
        } else {
          speakerMap.set(speaker.name, {
            company: speaker.company,
            sessionCount: 1,
            tracks: new Set([event.type]),
          });
        }
      }
    }

    const entries: SpeakerEntry[] = Array.from(speakerMap.entries()).map(
      ([name, data]) => ({
        name,
        company: data.company,
        sessionCount: data.sessionCount,
        tracks: Array.from(data.tracks),
      })
    );

    entries.sort((a, b) => b.sessionCount - a.sessionCount);
    return entries.slice(0, 30);
  }, [events]);

  const sortedData = useMemo(() => {
    const data = [...top30];
    data.sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "company":
          cmp = a.company.localeCompare(b.company);
          break;
        case "sessionCount":
          cmp = a.sessionCount - b.sessionCount;
          break;
        case "tracks":
          cmp = a.tracks.length - b.tracks.length;
          break;
        default:
          cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return data;
  }, [top30, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "company" ? "asc" : "desc");
    }
  }

  function handleSpeakerClick(name: string) {
    dispatch({ type: "SET_SPEAKER", payload: name });
  }

  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
      <h2 className="text-lg font-semibold p-4 text-gray-900 dark:text-gray-100">
        Speaker Leaderboard
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
              <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400 w-12">
                #
              </th>
              <th
                className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200"
                onClick={() => handleSort("name")}
              >
                Name{sortIndicator("name", sortKey, sortDir)}
              </th>
              <th
                className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 hidden sm:table-cell"
                onClick={() => handleSort("company")}
              >
                Company{sortIndicator("company", sortKey, sortDir)}
              </th>
              <th
                className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 w-24"
                onClick={() => handleSort("sessionCount")}
              >
                Sessions{sortIndicator("sessionCount", sortKey, sortDir)}
              </th>
              <th
                className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 w-20"
                onClick={() => handleSort("tracks")}
              >
                Tracks{sortIndicator("tracks", sortKey, sortDir)}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  No data available
                </td>
              </tr>
            ) : (
              sortedData.map((entry, i) => (
                <tr
                  key={entry.name}
                  className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer"
                  onClick={() => handleSpeakerClick(entry.name)}
                >
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-500">
                    {i + 1}
                  </td>
                  <td className="px-4 py-2 font-medium text-blue-600 dark:text-blue-400">
                    {entry.name}
                  </td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                    {entry.company}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-900 dark:text-gray-100">
                    {entry.sessionCount}
                  </td>
                  <td
                    className="px-4 py-2 text-right font-mono text-gray-900 dark:text-gray-100"
                    title={entry.tracks.join(", ")}
                  >
                    {entry.tracks.length}
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
