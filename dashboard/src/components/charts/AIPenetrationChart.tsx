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
import type { EnrichedData } from "../../lib/enriched-types";
import { useChartTheme } from "../../lib/chart-colors";
import ChartCard from "./ChartCard";

interface Props {
  enriched: EnrichedData;
}

const EXCLUDE_TRACKS = new Set(["AI + ML", "Agentics Day: MCP + Agents"]);

function aiColor(pct: number): string {
  if (pct >= 40) return "#d97706";
  if (pct >= 25) return "#f59e0b";
  if (pct >= 15) return "#fbbf24";
  if (pct >= 5) return "#fcd34d";
  return "#fef3c7";
}

export default function AIPenetrationChart({ enriched }: Props) {
  const theme = useChartTheme();

  const data = useMemo(() => {
    return Object.entries(enriched.ai_penetration.by_track)
      .filter(([track]) => !EXCLUDE_TRACKS.has(track))
      .map(([track, info]) => ({
        track,
        ai_pct: info.ai_pct,
        ai_events: info.ai_events,
        total_events: info.total_events,
      }))
      .sort((a, b) => b.ai_pct - a.ai_pct);
  }, [enriched]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    return (
      <div style={theme.tooltipContentStyle} className="p-2 text-sm">
        <p className="font-semibold mb-1">{label}</p>
        <p>{d.ai_pct.toFixed(1)}% ({d.ai_events}/{d.total_events} sessions)</p>
      </div>
    );
  };

  return (
    <ChartCard title="AI Penetration by Track">
      <ResponsiveContainer width="100%" height={420}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 40, left: 160, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme.gridColor}
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: theme.axisTickColor, fontSize: 11 }}
          />
          <YAxis
            type="category"
            dataKey="track"
            tick={{ fill: theme.axisTickColor, fontSize: 11 }}
            width={155}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="ai_pct" radius={[0, 4, 4, 0]}>
            {data.map((entry) => (
              <Cell key={entry.track} fill={aiColor(entry.ai_pct)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
