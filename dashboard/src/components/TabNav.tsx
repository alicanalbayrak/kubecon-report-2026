export type TabId = "overview" | "deep-analysis" | "narrative";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview" },
  { id: "deep-analysis", label: "Deep Analysis" },
  { id: "narrative", label: "Narrative" },
];

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="flex gap-1 border-b border-gray-200 dark:border-slate-700 mt-6">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === tab.id
              ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-b-0 border-gray-200 dark:border-slate-700 -mb-px"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
