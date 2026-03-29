import { useState, useEffect } from "react";
import { useFilter } from "../lib/filters";

export default function SearchBar() {
  const [localValue, setLocalValue] = useState("");
  const { filters, dispatch } = useFilter();

  // Debounce dispatch
  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "SET_SEARCH", payload: localValue });
    }, 300);
    return () => clearTimeout(timer);
  }, [localValue, dispatch]);

  // Sync external clears
  useEffect(() => {
    if (filters.search === "" && localValue !== "") {
      setLocalValue("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const handleClear = () => {
    setLocalValue("");
    dispatch({ type: "SET_SEARCH", payload: "" });
  };

  return (
    <div className="relative flex-1 max-w-md">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>

      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder="Search sessions, speakers..."
        className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Clear search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
