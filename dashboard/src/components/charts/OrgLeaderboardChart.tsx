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
import type { EnrichedData } from "../../lib/enriched-types";
import { useChartTheme, BAR_COLORS } from "../../lib/chart-colors";
import ChartCard from "./ChartCard";

interface Props {
  enriched: EnrichedData;
}

const OTHER_COLOR = "#94a3b8";

export default function OrgLeaderboardChart({ enriched }: Props) {
  const theme = useChartTheme();

  const { chartData, topCategories } = useMemo(() => {
    const top15 = enriched.org_leaderboard.top_companies.slice(0, 15);

    // Count category totals across all top15
    const catTotals: Record<string, number> = {};
    for (const company of top15) {
      for (const [cat, count] of Object.entries(company.categories)) {
        catTotals[cat] = (catTotals[cat] ?? 0) + count;
      }
    }

    // Top 5 categories
    const top5 = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    const top5Set = new Set(top5);

    const rows = top15.map((company) => {
      const row: Record<string, string | number> = { company: company.company };
      let otherCount = 0;
      for (const [cat, count] of Object.entries(company.categories)) {
        if (top5Set.has(cat)) {
          row[cat] = count;
        } else {
          otherCount += count;
        }
      }
      // Fill in zeros for missing top5
      for (const cat of top5) {
        if (!(cat in row)) row[cat] = 0;
      }
      row["Other"] = otherCount;
      return row;
    });

    return { chartData: rows, topCategories: top5 };
  }, [enriched]);

  return (
    <ChartCard title="Top 15 Organizations by Speaker Count">
      <ResponsiveContainer width="100%" height={460}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.gridColor}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: theme.axisTickColor, fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="company"
            tick={{ fill: theme.axisTickColor, fontSize: 11 }}
            width={85}
          />
          <Tooltip contentStyle={theme.tooltipContentStyle} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: theme.axisTickColor }}
          />
          {topCategories.map((cat, i) => (
            <Bar
              key={cat}
              dataKey={cat}
              stackId="a"
              fill={BAR_COLORS[i % BAR_COLORS.length]}
            />
          ))}
          <Bar key="Other" dataKey="Other" stackId="a" fill={OTHER_COLOR} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
