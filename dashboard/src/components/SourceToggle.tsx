import { useFilter } from "../lib/filters";

const options: Array<{ value: "all" | "main" | "colocated"; label: string }> = [
  { value: "all", label: "All" },
  { value: "main", label: "KubeCon Main" },
  { value: "colocated", label: "Co-located" },
];

export default function SourceToggle() {
  const { filters, dispatch } = useFilter();

  return (
    <div className="inline-flex rounded-lg bg-gray-100 dark:bg-slate-800 p-1">
      {options.map(({ value, label }) => {
        const isActive = filters.source === value;
        return (
          <button
            key={value}
            onClick={() => dispatch({ type: "SET_SOURCE", payload: value })}
            className={`px-4 py-2 rounded-md text-xs sm:text-sm font-medium cursor-pointer transition-colors ${
              isActive
                ? "bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
