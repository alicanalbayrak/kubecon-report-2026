import { useState, useEffect } from "react";
import type { Event } from "../../lib/types";

interface SessionListProps {
  events: Event[];
}

const PAGE_SIZE = 20;

export default function SessionList({ events }: SessionListProps) {
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Reset to page 1 when events change
  useEffect(() => {
    setPage(1);
  }, [events]);

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const paginatedEvents = events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (events.length === 0) {
    return (
      <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 mt-6">
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          No sessions match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {events.length.toLocaleString()} session{events.length !== 1 ? "s" : ""} found
      </h2>

      <div className="space-y-3">
        {paginatedEvents.map((event) => {
          const isExpanded = expanded.has(event.id);
          return (
            <div
              key={event.id}
              className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => toggleExpanded(event.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {event.cleanTitle}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                      {event.type}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      {event.experienceLevel}
                    </span>
                    {event.source === "colocated" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                        Co-located
                      </span>
                    )}
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{event.dateTime}</span>
                {event.venue && <> &middot; {event.venue}</>}
              </div>

              {event.speakerNames.length > 0 && (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {event.speakerNames.join(", ")}
                </div>
              )}

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {event.description || "No description available."}
                  </p>
                  {event.files.length > 0 && (
                    <div className="mt-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Slides:
                      </span>
                      {event.files.map((f) => (
                        <a
                          key={f.url}
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {f.filename}
                        </a>
                      ))}
                    </div>
                  )}
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on sched.com &rarr;
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded border border-gray-300 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
