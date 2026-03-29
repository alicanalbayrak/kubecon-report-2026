import { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import type { Event } from "../../lib/types";
import { useChartTheme } from "../../lib/chart-colors";
import ChartCard from "./ChartCard";

interface ExperienceLevelDonutProps {
  events: Event[];
}

const LEVEL_COLORS: Record<string, string> = {
  Beginner: "#10b981",
  Intermediate: "#3b82f6",
  Advanced: "#8b5cf6",
  Any: "#f59e0b",
  "Not specified": "#6b7280",
};

export default function ExperienceLevelDonut({
  events,
}: ExperienceLevelDonutProps) {
  const theme = useChartTheme();

  const data = useMemo(() => {
    const counts = new Map<string, number>();

    for (const event of events) {
      const level = event.experienceLevel || "Not specified";
      counts.set(level, (counts.get(level) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((entry) => entry.value > 0);
  }, [events]);

  const isSmallScreen =
    typeof window !== "undefined" && window.innerWidth < 640;
  const outerRadius = isSmallScreen ? 90 : 120;
  const innerRadius = isSmallScreen ? 50 : 70;

  const renderLabel = (props: PieLabelRenderProps) => {
    const name = String(props.name ?? "");
    const percent = Number(props.percent ?? 0);
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 300;
    return (
      <text
        x={x}
        y={y}
        fill={theme.labelColor}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${name} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (data.length === 0) {
    return (
      <ChartCard title="Experience Level Distribution">
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No data available
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Experience Level Distribution">
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
            dataKey="value"
            nameKey="name"
            label={renderLabel}
            labelLine={true}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={LEVEL_COLORS[entry.name] || "#6b7280"}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={theme.tooltipContentStyle}
            formatter={(value, name) => [
              `${value} sessions`,
              String(name),
            ]}
          />
          <Legend wrapperStyle={{ color: theme.labelColor }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
