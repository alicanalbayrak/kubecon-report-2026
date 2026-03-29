export interface EnrichedMetadata {
  generated_at: string;
  event_count: number;
  slide_count: number;
  slides_with_text: number;
  pipeline_version: string;
  semantic_analysis_at: string;
  categories_analyzed: number;
  meta_themes: number;
}

export interface OrgCompany {
  company: string;
  speaker_count: number;
  classification: string;
  categories: Record<string, number>;
}

export interface OrgLeaderboard {
  top_companies: OrgCompany[];
  company_classifications: Record<string, string>;
}

export interface TechMention {
  count: number;
  pct: number;
}

export interface KeywordTrends {
  by_category: Record<string, Record<string, number>>;
  tech_mentions: Record<string, Record<string, TechMention>>;
  keyword_clusters: Record<string, string[]>;
}

export interface AIPenetrationTrack {
  total_events: number;
  ai_events: number;
  ai_pct: number;
}

export interface AIPenetration {
  by_track: Record<string, AIPenetrationTrack>;
}

export interface TrackEndUserRatio {
  end_user_count: number;
  vendor_count: number;
  other_count: number;
  end_user_pct: number;
  vendor_pct: number;
  total: number;
}

export interface CompanyTopicHeatmap {
  companies: string[];
  categories: string[];
  cells: Array<{ company: string; category: string; count: number }>;
}

export interface CategoryTheme {
  name: string;
  maturity: "emerging" | "growing" | "established";
  explanation: string;
}

export interface PerCategoryAnalysis {
  group: string;
  themes: CategoryTheme[];
  cncf_projects: Array<{ name: string; context: string }>;
  surprising_talks: Array<{ title: string; why: string }>;
  industry_direction: string;
}

export interface MetaTheme {
  name: string;
  description: string;
  maturity: "emerging" | "growing" | "established";
  evidence_tracks: string[];
  key_signal: string;
}

export interface NarrativeArc {
  title: string;
  opening: string;
  rising_action: string;
  climax: string;
  resolution: string;
}

export interface OneToWatch {
  name: string;
  why: string;
  current_state: string;
  tracks_spotted: string[];
}

export interface EvolutionSignal {
  signal: string;
  from_state: string;
  to_state: string;
  evidence: string;
}

export interface UnexpectedAppearance {
  technology: string;
  expected_tracks: string[];
  unexpected_tracks: string[];
  significance: string;
}

export interface CrossCuttingAnalysis {
  meta_themes: MetaTheme[];
  unexpected_appearances: UnexpectedAppearance[];
  narrative_arc: NarrativeArc;
  evolution_signals: EvolutionSignal[];
  ones_to_watch: OneToWatch[];
}

export interface SemanticAnalysis {
  per_category: Record<string, PerCategoryAnalysis>;
  cross_cutting: CrossCuttingAnalysis;
}

export interface EnrichedData {
  metadata: EnrichedMetadata;
  org_leaderboard: OrgLeaderboard;
  keyword_trends: KeywordTrends;
  ai_penetration: AIPenetration;
  category_depth_matrix: Array<Record<string, unknown>>;
  category_pairs: Array<Record<string, unknown>>;
  architecture_patterns: { by_track: Record<string, Record<string, number>> };
  track_enduser_ratio: Record<string, TrackEndUserRatio>;
  company_topic_heatmap: CompanyTopicHeatmap;
  events: Array<Record<string, unknown>>;
  semantic_analysis?: SemanticAnalysis;
}
