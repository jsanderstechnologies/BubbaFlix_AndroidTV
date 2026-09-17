import { markAsWatchedOnSimkl } from "./simkl";

import axios from "axios";
import { getServerUrl } from "./serverSettings";

let syncTimeout = null;
export const forceSyncProgressToServer = async () => {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
  try {
    const baseUrl = getServerUrl();
    const token = localStorage.getItem("bubbaflix_token");
    if (token) {
      const all = JSON.parse(localStorage.getItem("bubbaflix_watch_progress") || "{}");
      await axios.put(
        `${baseUrl}/api/users/preferences`, 
        { watchProgress: all },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    }
  } catch (e) {
    console.error("Failed to sync watch progress to server", e);
  }
};

const syncProgressToServer = () => {
  if (syncTimeout) return;
  syncTimeout = setTimeout(() => {
    syncTimeout = null;
    forceSyncProgressToServer();
  }, 5000); // Throttle to 1 sync per 5 seconds
};

const STORAGE_KEY = "bubbaflix_watch_progress";

/**
 * Generate a unique key for movies or TV episodes.
 */
export const getMediaProgressKey = (tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) => {
  if (!tmdbId) return null;
  if (mediaType === "tv" || mediaType === "episode" || (seasonNum != null && episodeNum != null)) {
    return `tv_${tmdbId}_s${seasonNum || 1}_e${episodeNum || 1}`;
  }
  return `movie_${tmdbId}`;
};

/**
 * Get all stored watch progress items.
 */
export const getAllWatchProgress = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("[getAllWatchProgress Error]:", err);
    return {};
  }
};

/**
 * Get watch progress for a specific media item.
 */
export const getWatchProgress = (tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) => {
  const key = getMediaProgressKey(tmdbId, mediaType, seasonNum, episodeNum);
  if (!key) return null;
  const all = getAllWatchProgress();
  return all[key] || null;
};

/**
 * Save current playback position for a media item.
 */
export const saveWatchProgress = ({
  tmdbId,
  mediaType = "movie",
  seasonNum = null,
  episodeNum = null,
  currentTime = 0,
  duration = 0,
  title = "",
  posterPath = "",
  backdropPath = "",
  streamUrl = ""
}) => {
  const key = getMediaProgressKey(tmdbId, mediaType, seasonNum, episodeNum);
  if (!key || !duration || duration <= 0) return;

  const all = getAllWatchProgress();

  // If watched less than 10s, don't record yet
  if (currentTime < 10) return;

  const progressPercent = (currentTime / duration) * 100;

  // Only mark movie or episode as completed/watched when 95% has been watched
  if (progressPercent >= 95) {
    // Delete from in-progress list
    delete all[key];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      syncProgressToServer();
    } catch (e) {
      console.error("[watchProgress] Error clearing progress:", e);
    }
    
    // Auto-sync SIMKL watch history since it's fully watched
    markAsWatchedOnSimkl({
      tmdbId,
      title,
      mediaType,
      seasonNum,
      episodeNum,
    });
    
    // Trigger custom event so checkmarks in UI update instantly
    const event = new CustomEvent("simkl-watch-updated", { detail: { tmdbId, mediaType, seasonNum, episodeNum } });
    window.dispatchEvent(event);
    
    return;
  }

  all[key] = {
    key,
    tmdbId,
    mediaType,
    seasonNum,
    episodeNum,
    currentTime,
    duration,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    title,
    posterPath,
    backdropPath,
    updatedAt: Date.now()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    syncProgressToServer();
  } catch (e) {
    console.error("[saveWatchProgress Error]:", e);
  }
};

/**
 * Clear watch progress for a specific media item.
 */
export const clearAllShowProgress = (tmdbId) => {
  if (!tmdbId) return;
  const all = getAllWatchProgress();
  let modified = false;
  const prefix = `tv_${tmdbId}_`;
  Object.keys(all).forEach(k => {
    if (k.startsWith(prefix)) {
      delete all[k];
      modified = true;
    }
  });
  if (modified) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      syncProgressToServer();
    } catch (e) {
      console.error("[clearAllShowProgress Error]:", e);
    }
  }
};

export const clearWatchProgress = (tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) => {
  const key = getMediaProgressKey(tmdbId, mediaType, seasonNum, episodeNum);
  if (!key) return;
  const all = getAllWatchProgress();
  if (all[key]) {
    delete all[key];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      syncProgressToServer();
    } catch (e) {
      console.error("[clearWatchProgress Error]:", e);
    }
  }
};

/**
 * Format seconds into HH:MM:SS or MM:SS string.
 */
export const formatTimeDisplay = (totalSeconds) => {
  if (!totalSeconds || isNaN(totalSeconds)) return "00:00";
  const secNum = parseInt(totalSeconds, 10);
  const hours = Math.floor(secNum / 3600);
  const minutes = Math.floor((secNum - hours * 3600) / 60);
  const seconds = secNum - hours * 3600 - minutes * 60;

  if (hours > 0) {
    return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

const STREAM_URL_KEY = "bubbaflix_stream_urls";

/**
 * Save the last-played stream URL for a media item separately from watch progress.
 * This avoids interfering with the resume timestamp/prompt logic.
 */
export const saveStreamUrl = (tmdbId, mediaType, seasonNum, episodeNum, url) => {
  if (!tmdbId || !url) return;
  const key = getMediaProgressKey(tmdbId, mediaType, seasonNum, episodeNum);
  if (!key) return;
  try {
    const raw = localStorage.getItem(STREAM_URL_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[key] = url;
    localStorage.setItem(STREAM_URL_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("[saveStreamUrl Error]:", e);
  }
};

/**
 * Get the last-played stream URL for a media item.
 */
export const getStreamUrl = (tmdbId, mediaType, seasonNum, episodeNum) => {
  const key = getMediaProgressKey(tmdbId, mediaType, seasonNum, episodeNum);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(STREAM_URL_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (all[key]) return all[key];

    // Fallback for older items that had streamUrl saved in the main watch progress object
    const prog = getWatchProgress(tmdbId, mediaType, seasonNum, episodeNum);
    if (prog && prog.streamUrl) return prog.streamUrl;

    return null;
  } catch (e) {
    return null;
  }
};



