import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { Event } from "../../lib/types";
import { matchTrendingTopics } from "../../lib/text-analysis";
import { useFilter } from "../../lib/filters";
import { useChartTheme } from "../../lib/chart-colors";
import ChartCard from "./ChartCard";

interface TrendingTopicsChartProps {
  events: Event[];
}

export default function TrendingTopicsChart({
  events,
}: TrendingTopicsChartProps) {
  const theme = useChartTheme();
  const { dispatch } = useFilter();

  const data = useMemo(() => {
    const topics = matchTrendingTopics(events);
    return topics
      .map((entry) => ({
        topic: entry.topic,
        main: entry.mainCount,
        colocated: entry.colocatedCount,
        total: entry.count,
      }))
      .sort((a, b) => b.total - a.total);
  }, [events]);


  if (data.length === 0) {
    return (
      <ChartCard title="Trending Topics (Main vs Co-located)">
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No data available
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Trending Topics (Main vs Co-located)">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          onClick={(state) => {
            if (state?.activeLabel != null) {
              dispatch({
                type: "SET_TOPIC",
                payload: String(state.activeLabel),
              });
            }
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.gridColor}
            vertical={false}
          />
          <XAxis
            dataKey="topic"
            tick={{ fill: theme.axisTickColor, fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fill: theme.axisTickColor, fontSize: 12 }} />
          <Tooltip
            contentStyle={theme.tooltipContentStyle}
          />
          <Legend wrapperStyle={{ color: theme.labelColor }} />
          <Bar
            dataKey="main"
            name="KubeCon Main"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
          />
          <Bar
            dataKey="colocated"
            name="Co-located"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
