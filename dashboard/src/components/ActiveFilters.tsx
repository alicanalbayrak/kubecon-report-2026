import { useFilter } from "../lib/filters";

export default function ActiveFilters() {
  const { activeFilters, dispatch } = useFilter();

  if (activeFilters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-4">
      {activeFilters.map((filter) => (
        <span
          key={filter.type}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
        >
          {filter.label}
          <button
            onClick={filter.onClear}
            className="hover:text-blue-600 dark:hover:text-blue-100"
            aria-label={`Remove ${filter.label} filter`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </span>
      ))}
      <button
        onClick={() => dispatch({ type: "CLEAR_ALL" })}
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
      >
        Clear all
      </button>
    </div>
  );
}
