import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
}

export default function ChartCard({ title, children }: ChartCardProps) {
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        {title}
      </h2>
      {children}
    </div>
  );
}
