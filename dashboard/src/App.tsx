import { useState, useEffect, useMemo } from "react";
import type { Event, ConferenceInfo } from "./lib/types";
import type { EnrichedData } from "./lib/enriched-types";
import { loadAllEvents, loadEnrichedData } from "./lib/data-loader";
import {
  FilterProvider,
  useFilter,
  useFilteredEvents,
  computeStats,
} from "./lib/filters";
import Layout from "./components/Layout";
import HeroBanner from "./components/HeroBanner";
import SourceToggle from "./components/SourceToggle";
import SearchBar from "./components/SearchBar";
import ActiveFilters from "./components/ActiveFilters";
import TabNav, { type TabId } from "./components/TabNav";
import TopKeywordsChart from "./components/charts/TopKeywordsChart";
import EmergingQuadrant from "./components/charts/EmergingQuadrant";
import AIPenetrationChart from "./components/charts/AIPenetrationChart";
import OrgLeaderboardChart from "./components/charts/OrgLeaderboardChart";
import EndUserVendorChart from "./components/charts/EndUserVendorChart";
import ArchitecturePatternsChart from "./components/charts/ArchitecturePatternsChart";
import CNCFComponentsChart from "./components/charts/CNCFComponentsChart";
import TrendingTopicsChart from "./components/charts/TrendingTopicsChart";
import TrackDistribution from "./components/charts/TrackDistribution";
import ExperienceLevelDonut from "./components/charts/ExperienceLevelDonut";
import BigramTable from "./components/tables/BigramTable";
import SpeakerLeaderboard from "./components/tables/SpeakerLeaderboard";
import SessionList from "./components/tables/SessionList";

function OverviewTab({ sourceFiltered, filteredEvents }: { sourceFiltered: Event[]; filteredEvents: Event[] }) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <TopKeywordsChart events={sourceFiltered} />
        <CNCFComponentsChart events={sourceFiltered} />
        <TrendingTopicsChart events={sourceFiltered} />
        <TrackDistribution events={sourceFiltered} />
        <ExperienceLevelDonut events={sourceFiltered} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <BigramTable events={sourceFiltered} />
        <SpeakerLeaderboard events={sourceFiltered} />
      </div>

      <SessionList events={filteredEvents} />
    </>
  );
}

function DeepAnalysisTab({ enriched }: { enriched: EnrichedData }) {
  return (
    <div className="mt-6 space-y-6">
      <EmergingQuadrant enriched={enriched} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIPenetrationChart enriched={enriched} />
        <OrgLeaderboardChart enriched={enriched} />
        <EndUserVendorChart enriched={enriched} />
        <ArchitecturePatternsChart enriched={enriched} />
      </div>
    </div>
  );
}

function NarrativeTab({ enriched }: { enriched: EnrichedData }) {
  return (
    <div className="mt-6 text-gray-500 dark:text-gray-400 text-center py-12">
      Narrative views coming soon...
    </div>
  );
}

function AppContent({
  data,
  enriched,
}: {
  data: { events: Event[]; conferenceInfo: ConferenceInfo };
  enriched: EnrichedData;
}) {
  const { filters } = useFilter();
  const filteredEvents = useFilteredEvents(data.events);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const sourceFiltered = useMemo(() => {
    if (filters.source === "all") return data.events;
    return data.events.filter((e) => e.source === filters.source);
  }, [data.events, filters.source]);

  const stats = useMemo(() => computeStats(sourceFiltered), [sourceFiltered]);

  return (
    <>
      <HeroBanner conferenceInfo={data.conferenceInfo} stats={stats} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-6">
        <SourceToggle />
        <SearchBar />
      </div>

      <div className="mt-3">
        <ActiveFilters />
      </div>

      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "overview" && (
        <OverviewTab sourceFiltered={sourceFiltered} filteredEvents={filteredEvents} />
      )}
      {activeTab === "deep-analysis" && (
        <DeepAnalysisTab enriched={enriched} />
      )}
      {activeTab === "narrative" && (
        <NarrativeTab enriched={enriched} />
      )}
    </>
  );
}

function App() {
  const [data, setData] = useState<{
    events: Event[];
    conferenceInfo: ConferenceInfo;
  } | null>(null);
  const [enriched, setEnriched] = useState<EnrichedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadAllEvents(), loadEnrichedData()])
      .then(([eventsData, enrichedData]) => {
        setData(eventsData);
        setEnriched(enrichedData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">
          Loading conference data...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 font-medium">
            Failed to load data
          </p>
          <p className="text-gray-500 mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || !enriched) return null;

  return (
    <FilterProvider>
      <Layout>
        <AppContent data={data} enriched={enriched} />
      </Layout>
    </FilterProvider>
  );
}

export default App;
