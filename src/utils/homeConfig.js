import { getServerUrl } from "./serverSettings";

export const DEFAULT_HOME_SECTIONS = [
  { id: "trending", title: "Trending Content", enabled: true },
  { id: "new_movies", title: "New Release Movies", enabled: true },
  { id: "current_tv", title: "Current TV Episodes", enabled: true },
  { id: "popular_movies", title: "Popular Movies", enabled: true },
  { id: "popular_tv", title: "Popular TV Shows", enabled: true },
  { id: "continue_movies", title: "Continue Watching: Movies", enabled: false },
  { id: "continue_tv", title: "Continue Watching: TV Episodes", enabled: false },
];

export const validateHomeSections = (parsed) => {
  if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_HOME_SECTIONS;
  const validIds = new Set(DEFAULT_HOME_SECTIONS.map(s => s.id));
  const filteredParsed = parsed.filter(s => validIds.has(s.id));
  if (filteredParsed.length === 0) return DEFAULT_HOME_SECTIONS;

  const map = new Map(filteredParsed.map((s) => [s.id, s]));
  // Inject any new default sections that the user hasn't seen yet (appended at end, disabled)
  DEFAULT_HOME_SECTIONS.forEach((def) => {
    if (!map.has(def.id)) {
      map.set(def.id, def);
    }
  });
  return Array.from(map.values());
};

export const getHomeSections = () => {
  if (typeof window === "undefined") return DEFAULT_HOME_SECTIONS;
  try {
    const raw = localStorage.getItem("bubbaflix_home_sections");
    if (!raw) return DEFAULT_HOME_SECTIONS;
    const parsed = JSON.parse(raw);
    return validateHomeSections(parsed);
  } catch (e) {
    return DEFAULT_HOME_SECTIONS;
  }
};

export const saveHomeSections = (sections) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("bubbaflix_home_sections", JSON.stringify(sections));
  window.dispatchEvent(new Event("home-sections-updated"));

  // Sync to server so layout follows the user across devices
  const token = localStorage.getItem("bubbaflix_token");
  if (token) {
    fetch(`${getServerUrl()}/api/users/preferences`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ homeSections: sections }),
    }).catch((e) => console.warn("[homeConfig] Failed to sync home layout to server", e));
  }
};
