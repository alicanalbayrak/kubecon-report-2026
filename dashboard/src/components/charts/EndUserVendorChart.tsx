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
import { useChartTheme } from "../../lib/chart-colors";
import ChartCard from "./ChartCard";

interface Props {
  enriched: EnrichedData;
}

export default function EndUserVendorChart({ enriched }: Props) {
  const theme = useChartTheme();

  const data = useMemo(() => {
    return Object.entries(enriched.track_enduser_ratio)
      .map(([track, ratio]) => ({
        track,
        "End User": ratio.end_user_count,
        Vendor: ratio.vendor_count,
        Other: ratio.other_count,
        end_user_pct: ratio.end_user_pct,
        total: ratio.total,
      }))
      .sort((a, b) => b.end_user_pct - a.end_user_pct);
  }, [enriched]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    return (
      <div style={theme.tooltipContentStyle} className="p-2 text-sm">
        <p className="font-semibold mb-1">{label}</p>
        <p>End User: {d["End User"]} ({d.end_user_pct.toFixed(1)}%)</p>
        <p>Vendor: {d.Vendor}</p>
        <p>Other: {d.Other}</p>
        <p>Total: {d.total}</p>
      </div>
    );
  };

  return (
    <ChartCard title="End-User vs Vendor Representation by Track">
      <ResponsiveContainer width="100%" height={460}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
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
            dataKey="track"
            tick={{ fill: theme.axisTickColor, fontSize: 11 }}
            width={155}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: theme.axisTickColor }}
          />
          <Bar dataKey="End User" stackId="a" fill="#10b981" />
          <Bar dataKey="Vendor" stackId="a" fill="#3b82f6" />
          <Bar dataKey="Other" stackId="a" fill="#94a3b8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
