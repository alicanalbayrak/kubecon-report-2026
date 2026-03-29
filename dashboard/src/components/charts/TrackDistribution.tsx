import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import type { Event } from "../../lib/types";
import { useChartTheme, BAR_COLORS } from "../../lib/chart-colors";
import ChartCard from "./ChartCard";

interface TrackDistributionProps {
  events: Event[];
}

export default function TrackDistribution({ events }: TrackDistributionProps) {
  const theme = useChartTheme();

  const data = useMemo(() => {
    const counts = new Map<string, number>();

    for (const event of events) {
      const type = event.type;
      if (type === "Breaks" || type === "Registration") continue;
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([track, count]) => ({ track, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  if (data.length === 0) {
    return (
      <ChartCard title="Sessions per Track">
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No data available
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Sessions per Track">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.gridColor}
            vertical={false}
          />
          <XAxis
            dataKey="track"
            tick={{ fill: theme.axisTickColor, fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
          />
          <YAxis tick={{ fill: theme.axisTickColor, fontSize: 12 }} />
          <Tooltip
            contentStyle={theme.tooltipContentStyle}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={entry.track}
                fill={BAR_COLORS[index % BAR_COLORS.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
