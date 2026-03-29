import type { Event, FrequencyEntry, ComponentMatch, TopicMatch } from "./types";

export const STOP_WORDS = new Set([
  // English common stop words
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
  "her", "was", "one", "our", "out", "has", "have", "been", "some", "them",
  "than", "its", "over", "also", "that", "with", "this", "from", "will",
  "what", "when", "who", "how", "each", "she", "which", "their", "there",
  "would", "make", "like", "into", "could", "time", "very", "your", "about",
  "more", "these", "other", "just", "most", "much", "then", "such", "only",
  "being", "those", "both", "same", "through", "where", "does", "should",
  "between", "before", "after", "during", "without", "again", "because",
  "while", "here", "they", "were", "well", "need", "using", "used", "use",

  // Conference-specific stop words
  "session", "talk", "kubecon", "cncf", "speaker", "learn", "attendees",
  "conference", "event", "join", "day", "europe", "presentation", "discuss",
  "explore", "look", "way", "new", "work", "different", "come", "many",
  "help", "real", "world", "part", "first", "get", "take", "see",
  "provide", "show", "want", "build", "based", "including", "across",
  "ensure", "enable", "understand", "often", "may", "even", "still",
  "right", "best", "high", "two", "set", "run", "end", "key",
  "lets", "let", "yet", "read", "whether", "going", "able", "back",

  // Common technical filler words
  "open", "source", "project", "tool", "tools", "approach", "solution",
  "solutions", "practice", "practices", "system", "systems", "within",
  "applications", "application", "development", "developer", "developers",
  "challenges", "challenge", "design", "implement", "implementation",
  "introduction", "overview", "deep", "dive", "hands",

  // Legal/boilerplate text from event descriptions
  "sponsored", "content", "access", "visit", "third", "party", "booths",
  "activities", "registration", "data", "includes", "name", "last",
  "title", "company", "address", "email", "standard", "demographics",
  "privacy", "policies", "required", "never", "facilitate", "networking",
  "business", "relationships", "information", "please", "note",
  "attendee", "share", "contact", "personal", "purposes", "order",
  "agree", "terms", "conditions", "consent", "collect",
  "job", "function", "industry", "explicitly", "consenting",
  "questions", "regarding", "program", "committee", "native",
  "theater", "opening", "remarks", "linux", "foundation",
]);

export const CNCF_PROJECTS: Array<{ name: string; patterns: string[] }> = [
  { name: "Kubernetes", patterns: ["kubernetes", "k8s"] },
  { name: "Istio", patterns: ["istio"] },
  { name: "Cilium", patterns: ["cilium"] },
  { name: "eBPF", patterns: ["ebpf"] },
  { name: "Envoy", patterns: ["envoy"] },
  { name: "Argo", patterns: ["argo", "argocd", "argo cd", "argo workflows", "argo rollouts"] },
  { name: "Flux", patterns: ["flux", "fluxcd"] },
  { name: "Kueue", patterns: ["kueue"] },
  { name: "Kyverno", patterns: ["kyverno"] },
  { name: "OPA", patterns: ["opa", "open policy agent"] },
  { name: "Falco", patterns: ["falco"] },
  { name: "Prometheus", patterns: ["prometheus"] },
  { name: "OpenTelemetry", patterns: ["opentelemetry", "otel"] },
  { name: "Backstage", patterns: ["backstage"] },
  { name: "Crossplane", patterns: ["crossplane"] },
  { name: "Knative", patterns: ["knative"] },
  { name: "NATS", patterns: ["nats"] },
  { name: "containerd", patterns: ["containerd"] },
  { name: "etcd", patterns: ["etcd"] },
  { name: "CoreDNS", patterns: ["coredns", "core dns"] },
  { name: "Linkerd", patterns: ["linkerd"] },
  { name: "Keycloak", patterns: ["keycloak"] },
  { name: "Helm", patterns: ["helm"] },
  { name: "Gateway API", patterns: ["gateway api"] },
  { name: "gRPC", patterns: ["grpc"] },
  { name: "Fluentd", patterns: ["fluentd"] },
  { name: "Fluent Bit", patterns: ["fluent bit", "fluent-bit", "fluentbit"] },
  { name: "Jaeger", patterns: ["jaeger"] },
  { name: "Thanos", patterns: ["thanos"] },
  { name: "Cortex", patterns: ["cortex"] },
  { name: "KubeVirt", patterns: ["kubevirt"] },
  { name: "Vitess", patterns: ["vitess"] },
  { name: "Dapr", patterns: ["dapr"] },
  { name: "OpenKruise", patterns: ["openkruise", "kruise"] },
  { name: "Keda", patterns: ["keda"] },
  { name: "Cert-Manager", patterns: ["cert-manager", "cert manager", "certmanager"] },
  { name: "Spiffe/Spire", patterns: ["spiffe", "spire"] },
  { name: "Harbor", patterns: ["harbor"] },
  { name: "Notary", patterns: ["notary"] },
  { name: "TUF", patterns: ["tuf", "the update framework"] },
  { name: "in-toto", patterns: ["in-toto", "intoto"] },
  { name: "Sigstore", patterns: ["sigstore", "cosign"] },
  { name: "Tekton", patterns: ["tekton"] },
  { name: "KubeEdge", patterns: ["kubeedge"] },
  { name: "Volcano", patterns: ["volcano"] },
  { name: "OpenTofu", patterns: ["opentofu", "tofu"] },
  { name: "Kubeflow", patterns: ["kubeflow"] },
  { name: "WasmEdge", patterns: ["wasmedge"] },
  { name: "Spin", patterns: ["spin"] },
  { name: "WebAssembly", patterns: ["webassembly", "wasm", "wasi"] },
  { name: "Grafana", patterns: ["grafana"] },
  { name: "MCP", patterns: ["mcp", "model context protocol"] },
];

export const TOPIC_BUCKETS: Array<{ topic: string; keywords: string[] }> = [
  {
    topic: "AI / ML",
    keywords: [
      "ai", "ml", "llm", "gpu", "inference", "training", "model",
      "agent", "mcp", "kubeflow", "machine learning", "deep learning",
      "neural", "artificial intelligence", "genai", "generative",
    ],
  },
  {
    topic: "Platform Engineering",
    keywords: [
      "platform", "idp", "developer experience", "golden path",
      "backstage", "internal developer", "self-service", "portal",
    ],
  },
  {
    topic: "Security",
    keywords: [
      "security", "supply chain", "sbom", "vulnerability", "zero trust",
      "policy", "falco", "sigstore", "cosign", "admission", "rbac",
      "runtime security", "image signing", "software bill",
    ],
  },
  {
    topic: "Observability",
    keywords: [
      "observability", "tracing", "metrics", "logging", "opentelemetry",
      "prometheus", "grafana", "jaeger", "traces", "spans",
      "instrumentation", "telemetry",
    ],
  },
  {
    topic: "FinOps",
    keywords: [
      "cost", "finops", "optimization", "resource", "rightsizing",
      "efficiency", "cloud spend", "cost optimization",
    ],
  },
  {
    topic: "Networking",
    keywords: [
      "service mesh", "gateway api", "cilium", "ebpf", "envoy",
      "ingress", "networking", "network policy", "load balancing",
      "proxy", "traffic management",
    ],
  },
  {
    topic: "Edge / IoT",
    keywords: [
      "edge", "iot", "5g", "telco", "mec", "edge computing",
      "telecommunications",
    ],
  },
  {
    topic: "GitOps",
    keywords: [
      "gitops", "argo", "flux", "reconciliation", "declarative",
      "continuous delivery",
    ],
  },
  {
    topic: "Wasm",
    keywords: [
      "wasm", "webassembly", "wasi", "spin", "fermyon", "wasmedge",
      "wasmcloud",
    ],
  },
];

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getEventText(event: Event): string {
  return (event.cleanTitle + " " + event.description).toLowerCase();
}

// Precompile regexes at module level since CNCF_PROJECTS and TOPIC_BUCKETS are static
const CNCF_PROJECT_REGEXES = CNCF_PROJECTS.map((p) => ({
  name: p.name,
  regexes: p.patterns.map(
    (pat) => new RegExp("\\b" + escapeRegex(pat) + "\\b", "i")
  ),
}));

const TOPIC_BUCKET_REGEXES = TOPIC_BUCKETS.map((b) => ({
  topic: b.topic,
  regexes: b.keywords.map(
    (k) => new RegExp("\\b" + escapeRegex(k) + "\\b", "i")
  ),
}));

/**
 * Extract keyword frequencies from event titles and descriptions.
 */
export function extractKeywords(events: Event[]): FrequencyEntry[] {
  const freq = new Map<string, number>();

  for (const event of events) {
    const text = getEventText(event).replace(/[^a-z0-9\s-]/g, " ");
    const tokens = text.split(/\s+/).filter((t) => t.length >= 3);

    for (const token of tokens) {
      if (STOP_WORDS.has(token)) continue;
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extract bigram frequencies from event titles and descriptions.
 */
export function extractBigrams(events: Event[]): FrequencyEntry[] {
  const freq = new Map<string, number>();

  for (const event of events) {
    const text = getEventText(event).replace(/[^a-z0-9\s]/g, " ");

    const tokens = text.split(/\s+/).filter((t) => t.length > 0);

    for (let i = 0; i < tokens.length - 1; i++) {
      const a = tokens[i];
      const b = tokens[i + 1];

      if (a.length < 3 || b.length < 3) continue;
      if (STOP_WORDS.has(a) || STOP_WORDS.has(b)) continue;

      const bigram = a + " " + b;
      freq.set(bigram, (freq.get(bigram) ?? 0) + 1);
    }
  }

  return Array.from(freq.entries())
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Match events against the curated CNCF project list using word boundary regex.
 */
export function matchCNCFComponents(events: Event[]): ComponentMatch[] {
  const results: ComponentMatch[] = [];

  for (const project of CNCF_PROJECT_REGEXES) {
    const matchingEventIds: string[] = [];

    for (const event of events) {
      const text = getEventText(event);
      if (project.regexes.some((re) => re.test(text))) {
        matchingEventIds.push(event.id);
      }
    }

    if (matchingEventIds.length > 0) {
      results.push({
        name: project.name,
        count: matchingEventIds.length,
        matchingEventIds,
      });
    }
  }

  results.sort((a, b) => b.count - a.count);
  return results;
}

/**
 * Match events against trending topic buckets using word boundary regex.
 */
export function matchTrendingTopics(events: Event[]): TopicMatch[] {
  const results: TopicMatch[] = [];

  for (const bucket of TOPIC_BUCKET_REGEXES) {
    const matchingEventIds: string[] = [];
    let mainCount = 0;
    let colocatedCount = 0;

    for (const event of events) {
      const text = getEventText(event);
      if (bucket.regexes.some((re) => re.test(text))) {
        matchingEventIds.push(event.id);
        if (event.source === "main") {
          mainCount++;
        } else {
          colocatedCount++;
        }
      }
    }

    results.push({
      topic: bucket.topic,
      count: matchingEventIds.length,
      mainCount,
      colocatedCount,
      matchingEventIds,
    });
  }

  results.sort((a, b) => b.count - a.count);
  return results;
}
