import type { NarrativeArc as NarrativeArcType } from "../../lib/enriched-types";

interface Props {
  arc: NarrativeArcType;
}

const SECTIONS: { key: keyof Omit<NarrativeArcType, "title">; label: string }[] = [
  { key: "opening", label: "Opening" },
  { key: "rising_action", label: "Rising Action" },
  { key: "climax", label: "Climax" },
  { key: "resolution", label: "Resolution" },
];

export default function NarrativeArc({ arc }: Props) {
  return (
    <div className="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 p-6 md:p-8">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
        &ldquo;{arc.title}&rdquo;
      </h2>
      <div className="max-w-3xl mx-auto space-y-6">
        {SECTIONS.map(({ key, label }) => (
          <div key={key}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-2">
              {label}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-base">
              {arc[key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
