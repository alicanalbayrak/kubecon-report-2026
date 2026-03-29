import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { Event } from "../../lib/types";
import { extractKeywords } from "../../lib/text-analysis";
import { useFilter } from "../../lib/filters";
import { useChartTheme } from "../../lib/chart-colors";
import ChartCard from "./ChartCard";

interface TopKeywordsChartProps {
  events: Event[];
}

export default function TopKeywordsChart({ events }: TopKeywordsChartProps) {
  const theme = useChartTheme();
  const { dispatch } = useFilter();

  const data = useMemo(() => {
    const keywords = extractKeywords(events);
    return keywords.slice(0, 25).map((entry) => ({
      keyword: entry.term,
      count: entry.count,
    }));
  }, [events]);

  if (data.length === 0) {
    return (
      <ChartCard title="Top 25 Keywords">
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No data available
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Top 25 Keywords">
      <ResponsiveContainer width="100%" height={600}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          onClick={(state) => {
            if (state?.activeLabel != null) {
              dispatch({
                type: "SET_KEYWORD",
                payload: String(state.activeLabel),
              });
            }
          }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.gridColor}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: theme.axisTickColor, fontSize: 12 }}
          />
          <YAxis
            type="category"
            dataKey="keyword"
            tick={{ fill: theme.axisTickColor, fontSize: 12 }}
            width={90}
          />
          <Tooltip
            contentStyle={theme.tooltipContentStyle}
          />
          <Bar
            dataKey="count"
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
