import axios from "axios";
import { filterEnglishMedia } from "./filterUtils";

const BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmYjM3ODM3YzJiMDlkNzEyMDIwMDIxZjc0NGI5ZTQwNyIsInN1YiI6IjY0NjNlNzE5ZTNmYTJmMDEyNDQ3ODk1NCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.3Y0VloCdPlprLy-OMZQmqtZd4_Ti9GDfHo4SZXh3erU";

export const getActiveTmdbToken = () => {
  const customToken = typeof window !== "undefined" ? localStorage.getItem("tmdb_token") : null;
  if (customToken && customToken.trim().length > 0) {
    return customToken.trim();
  }
  return import.meta.env.VITE_APP_TMDB_KEY || DEFAULT_TMDB_TOKEN;
};

export const fetchDataFromAPI = async (url, params) => {
  try {
    const activeToken = getActiveTmdbToken();
    const headers = {
      Authorization: "bearer " + activeToken,
    };

    const customParams = {
      language: "en-US",
      with_original_language: "en",
      include_adult: false,
      ...params,
    };

    // Pre-filter on TMDB discover endpoints
    if (url.startsWith("/discover")) {
      customParams.without_genres = "16";
      customParams.with_original_language = "en";
    }

    const { data } = await axios.get(BASE_URL + url, {
      headers,
      params: customParams,
    });

    if (data && Array.isArray(data.results)) {
      data.results = filterEnglishMedia(data.results);
    }

    return data;
  } catch (e) {
    console.error("[TMDB API Request Failed]:", e?.message || e);
    // Return null on failure instead of AxiosError instance so callers never process error objects as media/collection items
    return null;
  }
};
