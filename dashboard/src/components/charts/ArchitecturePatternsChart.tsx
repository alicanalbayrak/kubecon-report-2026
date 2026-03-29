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
import type { EnrichedData } from "../../lib/enriched-types";
import { useChartTheme } from "../../lib/chart-colors";
import ChartCard from "./ChartCard";

interface Props {
  enriched: EnrichedData;
}

export default function ArchitecturePatternsChart({ enriched }: Props) {
  const theme = useChartTheme();

  const data = useMemo(() => {
    const byTrack = enriched.architecture_patterns.by_track;
    const patternTotals = new Map<string, number>();
    for (const trackPatterns of Object.values(byTrack)) {
      for (const [pattern, count] of Object.entries(trackPatterns)) {
        patternTotals.set(pattern, (patternTotals.get(pattern) ?? 0) + count);
      }
    }
    return [...patternTotals.entries()]
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // top 10 patterns
  }, [enriched]);

  return (
    <ChartCard title="Architecture Patterns Mentioned">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} vertical={false} />
          <XAxis
            dataKey="pattern"
            tick={{ fill: theme.axisTickColor, fontSize: 12 }}
            angle={-20}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fill: theme.axisTickColor, fontSize: 11 }} />
          <Tooltip contentStyle={theme.tooltipContentStyle} />
          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
