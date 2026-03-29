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

const PATTERNS = ["Gateway", "Operator", "Sidecar", "GitOps", "Service Mesh", "Multi-Cluster"];

export default function ArchitecturePatternsChart({ enriched }: Props) {
  const theme = useChartTheme();

  const data = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const pattern of PATTERNS) {
      totals[pattern] = 0;
    }
    for (const trackPatterns of Object.values(enriched.architecture_patterns.by_track)) {
      for (const pattern of PATTERNS) {
        totals[pattern] += trackPatterns[pattern] ?? 0;
      }
    }
    return Object.entries(totals)
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count);
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
