import axios from "axios";
import { fetchDataFromAPI } from "./api";

const getImdbId = async (tmdbId, mediaType) => {
  if (!tmdbId) return null;
  try {
    const res = await fetchDataFromAPI(`/${mediaType || "movie"}/${tmdbId}/external_ids`);
    return res?.imdb_id || null;
  } catch (err) {
    return null;
  }
};

export const convertSrtToVtt = (srtText) => {
  if (!srtText) return "";
  let vtt = "WEBVTT\n\n";
  vtt += srtText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return vtt;
};

export const fetchOpenSubtitles = async ({ tmdbId, imdbId, mediaType = "movie", seasonNum, episodeNum }) => {
  let targetImdbId = imdbId;
  if (!targetImdbId && tmdbId) {
    targetImdbId = await getImdbId(tmdbId, mediaType);
  }

  if (!targetImdbId) return [];

  const cleanImdbNum = targetImdbId.replace(/^tt/, "");

  const results = [];

  // 1. Fetch from Wyzie Subtitles API (High Reliability & Direct CORS support)
  try {
    let wyzieUrl = `https://sub.wyzie.ru/search?id=tt${cleanImdbNum}`;
    if (mediaType === "tv" || mediaType === "series" || seasonNum !== undefined) {
      const s = seasonNum !== undefined ? seasonNum : 1;
      const e = episodeNum !== undefined ? episodeNum : 1;
      wyzieUrl += `&season=${s}&episode=${e}`;
    }

    console.log(`[Wyzie Subtitles API] Fetching from: ${wyzieUrl}`);
    const wyzieRes = await axios.get(wyzieUrl, { timeout: 6000 });

    if (Array.isArray(wyzieRes.data) && wyzieRes.data.length > 0) {
      wyzieRes.data.forEach((item, idx) => {
        if (item && item.url) {
          results.push({
            id: item.id || `wyzie-${idx}`,
            language: item.display || item.language || "English",
            langCode: item.language || "en",
            fileName: item.display ? `${item.display} Subtitle` : `Subtitle #${idx + 1}`,
            downloadLink: item.url,
            format: "vtt",
            encoding: "UTF-8",
          });
        }
      });
    }
  } catch (err) {
    console.warn("[Wyzie Subtitles Error]:", err.message);
  }

  // 2. Fetch from OpenSubtitles REST API (Fallback)
  try {
    let endpoint = `https://rest.opensubtitles.org/search/imdbid-${cleanImdbNum}`;
    if (mediaType === "tv" || mediaType === "series" || seasonNum !== undefined) {
      const s = seasonNum !== undefined ? seasonNum : 1;
      const e = episodeNum !== undefined ? episodeNum : 1;
      endpoint += `/season-${s}/episode-${e}`;
    }
    endpoint += `/sublanguageid-eng,spa,fre,ger,por`;

    console.log(`[OpenSubtitles API] Fetching from: ${endpoint}`);
    const response = await axios.get(endpoint, {
      headers: {
        "User-Agent": "TemporaryUserAgent v1.0",
      },
      timeout: 6000,
    });

    const rawList = Array.isArray(response.data) ? response.data : [];

    rawList.forEach((item, idx) => {
      if (item && (item.SubDownloadLink || item.ZipDownloadLink)) {
        results.push({
          id: item.IDSubtitleFile || `os-${idx}`,
          language: item.LanguageName || item.SubLanguageID || "English",
          langCode: item.SubLanguageID || "en",
          fileName: item.SubFileName || item.MovieReleaseName || `Subtitle #${idx + 1}`,
          downloadLink: item.SubDownloadLink,
          format: item.SubFormat || "srt",
          encoding: item.SubEncoding || "UTF-8",
        });
      }
    });
  } catch (err) {
    console.warn("[OpenSubtitles Fetch Error]:", err.message);
  }

  // Deduplicate results by downloadLink
  const seen = new Set();
  const deduplicated = results.filter((item) => {
    if (!item.downloadLink || seen.has(item.downloadLink)) return false;
    seen.add(item.downloadLink);
    return true;
  });

  return deduplicated;
};

export const downloadAndConvertSubtitle = async (downloadUrl) => {
  if (!downloadUrl) return null;
  try {
    const res = await axios.get(downloadUrl, {
      headers: { "User-Agent": "TemporaryUserAgent v1.0" },
      responseType: "arraybuffer",
      timeout: 10000,
    });

    let srtText = "";

    if (downloadUrl.endsWith(".gz") || (res.data[0] === 0x1f && res.data[1] === 0x8b)) {
      const pako = await import("pako");
      const decompressed = pako.ungzip(new Uint8Array(res.data), { to: "string" });
      srtText = decompressed;
    } else {
      const decoder = new TextDecoder("utf-8");
      srtText = decoder.decode(res.data);
    }

    const vttText = convertSrtToVtt(srtText);
    const blob = new Blob([vttText], { type: "text/vtt" });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn("[Subtitle Download/Convert Error]:", err.message);
    return null;
  }
};
