import type {
  RawConferenceData,
  Event,
  Speaker,
  Source,
  ExperienceLevel,
  ConferenceInfo,
} from "./types";
import type { EnrichedData } from "./enriched-types";

/**
 * Strip leading non-alphanumeric characters (emoji prefixes, symbols, etc.)
 */
export function stripEmoji(text: string): string {
  return text.replace(/^[^a-zA-Z0-9]+/, "").trim();
}

/**
 * Extract company from a speaker title string.
 * Takes everything after the last comma; if no comma, returns the full string trimmed.
 */
export function extractCompany(title: string): string {
  const lastComma = title.lastIndexOf(",");
  if (lastComma === -1) return title.trim();
  return title.substring(lastComma + 1).trim();
}

/**
 * Generate a stable, unique ID from a URL.
 */
function generateId(url: string): string {
  return btoa(url);
}

/**
 * Parse a date string, handling timezone offsets without colons (e.g. +0100).
 */
function parseDate(dateStr: string): Date {
  let d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    // Try inserting a colon in the timezone offset: +0100 -> +01:00
    const fixed = dateStr.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
    d = new Date(fixed);
  }
  return d;
}

/**
 * Flatten a RawConferenceData into an array of enriched Event objects.
 */
function flattenEvents(
  data: RawConferenceData,
  source: Source
): Event[] {
  const events: Event[] = [];

  for (const [typeName, typeGroup] of Object.entries(data.types)) {
    const cleanType = stripEmoji(typeName);

    for (const raw of typeGroup.events) {
      const speakers: Speaker[] = raw.speakers.map((s) => ({
        name: s.name,
        title: s.title,
        company: extractCompany(s.title),
        bio: s.bio,
      }));

      const experienceLevel: ExperienceLevel =
        raw.experience_level === ""
          ? "Not specified"
          : (raw.experience_level as ExperienceLevel);

      events.push({
        id: generateId(raw.url),
        url: raw.url,
        title: raw.title,
        cleanTitle: stripEmoji(raw.title),
        description: raw.description,
        dateTime: raw.date_time,
        startDate: parseDate(raw.start_date),
        endDate: parseDate(raw.end_date),
        venue: raw.venue,
        speakers,
        speakerNames: speakers.map((s) => s.name),
        speakerCount: speakers.length,
        type: cleanType,
        experienceLevel,
        files: raw.files,
        fileCount: raw.files.length,
        source,
        conferenceName: data.conference,
      });
    }
  }

  return events;
}

/**
 * Fetch both conference JSON files, flatten, and return merged events plus metadata.
 */
export async function loadAllEvents(): Promise<{
  events: Event[];
  conferenceInfo: ConferenceInfo;
}> {
  const base = import.meta.env.BASE_URL;
  const [mainRes, colocatedRes] = await Promise.all([
    fetch(`${base}data/kubecon-main.json`),
    fetch(`${base}data/colocated-events.json`),
  ]);

  if (!mainRes.ok) {
    throw new Error(
      `Failed to fetch main conference data: ${mainRes.status} ${mainRes.statusText}`
    );
  }
  if (!colocatedRes.ok) {
    throw new Error(
      `Failed to fetch co-located events data: ${colocatedRes.status} ${colocatedRes.statusText}`
    );
  }

  const mainData: RawConferenceData = await mainRes.json();
  const colocatedData: RawConferenceData = await colocatedRes.json();

  const mainEvents = flattenEvents(mainData, "main");
  const colocatedEvents = flattenEvents(colocatedData, "colocated");

  const events = [...mainEvents, ...colocatedEvents];

  const conferenceInfo: ConferenceInfo = {
    mainConference: mainData.conference,
    colocatedConference: colocatedData.conference,
    dates: mainData.dates,
    location: mainData.location,
  };

  return { events, conferenceInfo };
}

export async function loadEnrichedData(): Promise<EnrichedData> {
  const base = import.meta.env.BASE_URL;
  const res = await fetch(`${base}data/enriched.json`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch enriched data: ${res.status} ${res.statusText}`
    );
  }
  return res.json();
}
