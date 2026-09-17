import { applyTheme } from "./theme";
import { fetchUserSimklHistory } from "./simkl";

export const DEFAULT_SERVER_URL = "";

export const getServerUrl = () => "";

export const isAndroidTvClient = () => {
  if (typeof window === "undefined") return true;
  if (window.AndroidPlayer) return true;
  const ua = navigator.userAgent || "";
  return (
    ua.includes("BubbaFlixTV") ||
    ua.includes("ExoPlayer") ||
    ua.includes("AndroidTV") ||
    ua.includes("SmartTV") ||
    ua.includes("BRAVIA") ||
    ua.includes("MiTV") ||
    /Android|Tablet|Mobile|Silk|Kindle|KFTRWI/i.test(ua)
  );
};

export const getTranscodedStreamUrl = (url) => {
  if (!url) return "";
  let innerUrl = url;
  if (url.includes("/api/transcode")) {
    const split = url.split("?url=");
    if (split.length > 1) {
      try {
        innerUrl = decodeURIComponent(split[1]);
      } catch (e) {
        innerUrl = split[1];
      }
    }
  }
  return innerUrl;
};

export const getProxiedImageUrl = (url) => {
  if (!url) return "";
  return url;
};

export const saveServerUrl = () => {};

export const fetchServerSettings = async () => {
  const theme = localStorage.getItem("bubbaflix_theme") || "dark-red";
  const simklClientId = localStorage.getItem("simkl_client_id") || "";
  const simklClientSecret = localStorage.getItem("simkl_client_secret") || "";
  const groqKey = localStorage.getItem("groq_api_key") || "";
  const tmdbToken = localStorage.getItem("tmdb_token") || "";
  const premiumizeKey = localStorage.getItem("premiumize_api_key") || "";

  applyTheme(theme);
  if (simklClientId) {
    fetchUserSimklHistory();
  }

  return {
    theme,
    simklClientId,
    simklClientSecret,
    groqKey,
    tmdbToken,
    premiumizeKey,
    stream_resolutions: JSON.parse(localStorage.getItem("stream_resolutions") || '["2160p", "1080p", "720p", "480p"]'),
    stream_exclude_low_quality: JSON.parse(localStorage.getItem("stream_exclude_low_quality") || "true")
  };
};

export const updateServerSettings = async (settingsPartial) => {
  if (!settingsPartial) return { success: true };
  if (settingsPartial.theme) {
    localStorage.setItem("bubbaflix_theme", settingsPartial.theme);
    applyTheme(settingsPartial.theme);
  }
  if (settingsPartial.simklClientId !== undefined) {
    localStorage.setItem("simkl_client_id", settingsPartial.simklClientId.trim());
  }
  if (settingsPartial.groqKey !== undefined) {
    localStorage.setItem("groq_api_key", settingsPartial.groqKey.trim());
  }
  if (settingsPartial.tmdbToken !== undefined) {
    if (settingsPartial.tmdbToken.trim()) {
      localStorage.setItem("tmdb_token", settingsPartial.tmdbToken.trim());
    } else {
      localStorage.removeItem("tmdb_token");
    }
  }
  if (settingsPartial.premiumizeKey !== undefined) {
    if (settingsPartial.premiumizeKey.trim()) {
      localStorage.setItem("premiumize_api_key", settingsPartial.premiumizeKey.trim());
    } else {
      localStorage.removeItem("premiumize_api_key");
    }
  }
  return { success: true };
};

export const testBackendServerHealth = async () => {
  return { success: true, message: "Local Android TV Engine Active (Standalone Mode)" };
};
