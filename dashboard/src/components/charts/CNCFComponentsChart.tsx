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
import { matchCNCFComponents } from "../../lib/text-analysis";
import { useFilter } from "../../lib/filters";
import { useChartTheme } from "../../lib/chart-colors";
import ChartCard from "./ChartCard";

interface CNCFComponentsChartProps {
  events: Event[];
}

export default function CNCFComponentsChart({
  events,
}: CNCFComponentsChartProps) {
  const theme = useChartTheme();
  const { dispatch } = useFilter();

  const data = useMemo(() => {
    const components = matchCNCFComponents(events);
    return components.slice(0, 30).map((entry) => ({
      name: entry.name,
      count: entry.count,
    }));
  }, [events]);

  if (data.length === 0) {
    return (
      <ChartCard title="CNCF Project Mentions">
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          No data available
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="CNCF Project Mentions">
      <ResponsiveContainer
        width="100%"
        height={Math.max(400, data.length * 28)}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          onClick={(state) => {
            if (state?.activeLabel != null) {
              dispatch({
                type: "SET_COMPONENT",
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
            dataKey="name"
            tick={{ fill: theme.axisTickColor, fontSize: 12 }}
            width={110}
          />
          <Tooltip
            contentStyle={theme.tooltipContentStyle}
          />
          <Bar
            dataKey="count"
            fill="#8b5cf6"
            radius={[0, 4, 4, 0]}
            cursor="pointer"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
