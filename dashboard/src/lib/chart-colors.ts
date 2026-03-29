import { useState, useEffect, useMemo } from "react";

export function useChartTheme() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return useMemo(() => {
    const tooltipContentStyle = {
      backgroundColor: isDark ? "#1e293b" : "#ffffff",
      border: `1px solid ${isDark ? "#475569" : "#e5e7eb"}`,
      borderRadius: "8px",
      color: isDark ? "#f1f5f9" : "#1f2937",
    };

    return {
      isDark,
      gridColor: isDark ? "#334155" : "#e5e7eb",
      axisTickColor: isDark ? "#9ca3af" : "#6b7280",
      tooltipBg: isDark ? "#1e293b" : "#ffffff",
      tooltipBorder: isDark ? "#475569" : "#e5e7eb",
      tooltipText: isDark ? "#f1f5f9" : "#1f2937",
      labelColor: isDark ? "#d1d5db" : "#374151",
      tooltipContentStyle,
    };
  }, [isDark]);
}

export const BAR_COLORS = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
];
