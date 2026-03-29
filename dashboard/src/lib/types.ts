/** A single file attachment on an event */
export interface RawFile {
  url: string;
  filename: string;
  local_path: string;
}

/** A speaker entry as it appears in the JSON */
export interface RawSpeaker {
  name: string;
  title: string;
  bio: string;
}

/** A single event as it appears nested under a type in the JSON */
export interface RawEvent {
  url: string;
  title: string;
  description: string;
  date_time: string;
  venue: string;
  speakers: RawSpeaker[];
  type: string;
  experience_level: string;
  files: RawFile[];
  start_date: string;
  end_date: string;
}

/** A type/track grouping in the JSON */
export interface RawTypeGroup {
  event_count: number;
  events: RawEvent[];
}

/** Root shape of each index.json file */
export interface RawConferenceData {
  conference: string;
  dates: string;
  location: string;
  base_url: string;
  types: Record<string, RawTypeGroup>;
}

export type Source = "main" | "colocated";

export type ExperienceLevel =
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "Any"
  | "Not specified";

/** Speaker with extracted company */
export interface Speaker {
  name: string;
  title: string;
  company: string;
  bio: string;
}

/** Flattened, enriched event used everywhere in the app */
export interface Event {
  id: string;
  url: string;
  title: string;
  cleanTitle: string;
  description: string;
  dateTime: string;
  startDate: Date;
  endDate: Date;
  venue: string;
  speakers: Speaker[];
  speakerNames: string[];
  speakerCount: number;
  type: string;
  experienceLevel: ExperienceLevel;
  files: RawFile[];
  fileCount: number;
  source: Source;
  conferenceName: string;
}

/** Conference metadata for display in hero banner */
export interface ConferenceInfo {
  mainConference: string;
  colocatedConference: string;
  dates: string;
  location: string;
}

/** Aggregate stats */
export interface DashboardStats {
  totalSessions: number;
  uniqueSpeakers: number;
  trackCount: number;
  slidesCount: number;
}

/** Keyword/bigram result */
export interface FrequencyEntry {
  term: string;
  count: number;
}

/** CNCF component match result */
export interface ComponentMatch {
  name: string;
  count: number;
  matchingEventIds: string[];
}

/** Topic bucket result */
export interface TopicMatch {
  topic: string;
  count: number;
  mainCount: number;
  colocatedCount: number;
  matchingEventIds: string[];
}

/** Speaker leaderboard entry */
export interface SpeakerEntry {
  name: string;
  company: string;
  sessionCount: number;
  tracks: string[];
}
