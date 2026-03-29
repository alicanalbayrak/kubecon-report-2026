import type { ConferenceInfo, DashboardStats } from "../lib/types";

interface HeroBannerProps {
  conferenceInfo: ConferenceInfo;
  stats: DashboardStats;
}

function CalendarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 text-blue-100 mx-auto mb-1"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 text-blue-100 mx-auto mb-1"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 text-blue-100 mx-auto mb-1"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 text-blue-100 mx-auto mb-1"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

const statCards = [
  { key: "totalSessions" as const, label: "Sessions", Icon: CalendarIcon },
  { key: "uniqueSpeakers" as const, label: "Speakers", Icon: PersonIcon },
  { key: "trackCount" as const, label: "Tracks", Icon: GridIcon },
  { key: "slidesCount" as const, label: "Slides", Icon: DocumentIcon },
];

export default function HeroBanner({ conferenceInfo, stats }: HeroBannerProps) {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl px-6 py-8">
      <h2 className="text-2xl md:text-3xl font-bold text-white">
        {conferenceInfo.mainConference}
      </h2>
      <p className="text-blue-100 mt-1">
        {conferenceInfo.dates} &middot; {conferenceInfo.location}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
        {statCards.map(({ key, label, Icon }) => (
          <div
            key={key}
            className="bg-white/10 backdrop-blur rounded-lg px-4 py-3 text-center"
          >
            <Icon />
            <div className="text-2xl font-bold text-white">
              {stats[key].toLocaleString()}
            </div>
            <div className="text-sm text-blue-100">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
