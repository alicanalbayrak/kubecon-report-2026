import { useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { EnrichedData } from "../../lib/enriched-types";
import { useChartTheme } from "../../lib/chart-colors";
import ChartCard from "./ChartCard";

interface Props {
  enriched: EnrichedData;
}

const MATURITY_SCORE: Record<string, number> = {
  emerging: 1,
  growing: 2,
  established: 3,
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export default function EmergingQuadrant({ enriched }: Props) {
  const theme = useChartTheme();

  const { points, medianX, medianY } = useMemo(() => {
    const { tech_mentions } = enriched.keyword_trends;
    const main = tech_mentions["main"] ?? {};
    const colocated = tech_mentions["colocated"] ?? {};

    // Build maturity map from semantic analysis themes
    const maturityMap: Record<string, number[]> = {};
    for (const cat of Object.values(enriched.semantic_analysis.per_category)) {
      for (const theme of cat.themes) {
        const score = MATURITY_SCORE[theme.maturity] ?? 2;
        const key = theme.name.toLowerCase();
        // Try to match theme name against known tech names (loose word overlap)
        if (!maturityMap[key]) maturityMap[key] = [];
        maturityMap[key].push(score);
      }
    }

    // Find maturity score for a tech name by fuzzy matching theme names
    function getMaturityScore(tech: string): number {
      const techLower = tech.toLowerCase();
      const matches: number[] = [];
      for (const [themeName, scores] of Object.entries(maturityMap)) {
        if (themeName.includes(techLower) || techLower.split("/").some((part) => themeName.includes(part))) {
          matches.push(...scores);
        }
      }
      if (matches.length > 0) {
        return matches.reduce((a, b) => a + b, 0) / matches.length;
      }
      return 2; // default: growing
    }

    // Gather all tech names
    const allTechs = new Set([...Object.keys(main), ...Object.keys(colocated)]);

    const pts = Array.from(allTechs).map((tech) => {
      const mainCount = main[tech]?.count ?? 0;
      const colocCount = colocated[tech]?.count ?? 0;
      const totalCount = mainCount + colocCount;
      // Track spread: count how many sources have this tech > 0
      const spread = (mainCount > 0 ? 1 : 0) + (colocCount > 0 ? 1 : 0);
      const maturity = getMaturityScore(tech);
      return { tech, x: totalCount, y: maturity, z: spread };
    });

    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);

    return {
      points: pts,
      medianX: median(xs),
      medianY: median(ys),
    };
  }, [enriched]);

  const maturityLabel = (value: number) => {
    if (value === 1) return "Emerging";
    if (value === 2) return "Growing";
    if (value === 3) return "Established";
    return String(value);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    return (
      <div style={theme.tooltipContentStyle} className="p-2 text-sm">
        <p className="font-semibold">{d.tech}</p>
        <p>Mentions: {d.x}</p>
        <p>Maturity: {maturityLabel(d.y)}</p>
      </div>
    );
  };

  return (
    <ChartCard title="Technology Landscape: Frequency vs Maturity">
      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} />
          <XAxis
            type="number"
            dataKey="x"
            name="Mentions"
            label={{
              value: "Total Mentions",
              position: "insideBottom",
              offset: -10,
              fill: theme.axisTickColor,
              fontSize: 12,
            }}
            tick={{ fill: theme.axisTickColor, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Maturity"
            domain={[0.5, 3.5]}
            ticks={[1, 2, 3]}
            tickFormatter={maturityLabel}
            tick={{ fill: theme.axisTickColor, fontSize: 11 }}
            width={80}
          />
          <ZAxis type="number" dataKey="z" range={[60, 180]} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={medianX}
            stroke={theme.gridColor}
            strokeDasharray="6 3"
            strokeWidth={2}
          />
          <ReferenceLine
            y={medianY}
            stroke={theme.gridColor}
            strokeDasharray="6 3"
            strokeWidth={2}
          />
          <Scatter
            data={points}
            fill="#8b5cf6"
            stroke="#7c3aed"
            strokeWidth={1}
            fillOpacity={0.75}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
