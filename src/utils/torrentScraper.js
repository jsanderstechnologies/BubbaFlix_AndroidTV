import axios from "axios";
import { fetchDataFromAPI } from "./api";

/**
 * Fetch external IMDb ID for TMDB media items if available
 */
const fetchImdbId = async (tmdbId, mediaType) => {
  if (!tmdbId) return null;
  try {
    const res = await fetchDataFromAPI(`/${mediaType || "movie"}/${tmdbId}/external_ids`);
    return res?.imdb_id || null;
  } catch (err) {
    return null;
  }
};

/**
 * Scrape torrent magnet links for Movies and TV Shows from public torrent indexes & Torrentio
 */
export const fetchTorrentStreams = async ({ tmdbId, mediaType = "movie", seasonNum, episodeNum, title, year }) => {
  try {
    const imdbId = await fetchImdbId(tmdbId, mediaType);
    const idToUse = imdbId || (tmdbId ? `tmdb:${tmdbId}` : null);

    const isTv = mediaType === "tv" || seasonNum !== undefined;
    const streams = [];

    // 1. Primary Scraper: Torrentio Stremio API
    if (idToUse) {
      try {
        let torrentioUrl = "";
        if (isTv) {
          const s = seasonNum || 1;
          const e = episodeNum || 1;
          torrentioUrl = `https://torrentio.strem.fun/stream/series/${idToUse}:${s}:${e}.json`;
        } else {
          torrentioUrl = `https://torrentio.strem.fun/stream/movie/${idToUse}.json`;
        }

        const res = await axios.get(torrentioUrl, { timeout: 8000 });
        if (res.data && Array.isArray(res.data.streams)) {
          res.data.streams.forEach((item) => {
            let magnet = item.url;
            if (!magnet && item.infoHash) {
              magnet = `magnet:?xt=urn:btih:${item.infoHash}`;
              if (item.title) {
                const firstLine = item.title.split("\n")[0];
                magnet += `&dn=${encodeURIComponent(firstLine)}`;
              }
            }

            if (magnet) {
              const rawTitle = item.title || item.name || "Torrent Stream";
              const lines = rawTitle.split("\n");
              const fileName = lines[0] || "Torrent Stream";
              const metaInfo = lines.slice(1).join(" • ") || item.name || "";

              let quality = "HD";
              if (/2160p|4k|uhd/i.test(rawTitle)) quality = "2160p";
              else if (/1080p|fullhd/i.test(rawTitle)) quality = "1080p";
              else if (/720p|hd/i.test(rawTitle)) quality = "720p";
              else if (/480p|sd/i.test(rawTitle)) quality = "480p";

              streams.push({
                name: item.name || `[Torrent] ${quality}`,
                title: fileName,
                metaText: metaInfo,
                url: magnet,
                quality,
                behaviorHints: item.behaviorHints || {}
              });
            }
          });
        }
      } catch (err) {
        console.warn("[TorrentScraper] Torrentio fetch warning:", err.message);
      }
    }

    // 2. Secondary Scraper: SolidTorrents Search API
    if (streams.length === 0 && title) {
      try {
        let searchQuery = title;
        if (isTv) {
          const s = String(seasonNum || 1).padStart(2, "0");
          const e = String(episodeNum || 1).padStart(2, "0");
          searchQuery += ` S${s}E${e}`;
        } else if (year) {
          searchQuery += ` ${year}`;
        }

        const solidUrl = `https://solidtorrents.net/api/v1/search?q=${encodeURIComponent(searchQuery)}`;
        const solidRes = await axios.get(solidUrl, { timeout: 6000 });

        if (solidRes.data && Array.isArray(solidRes.data.results)) {
          solidRes.data.results.forEach((item) => {
            if (item.magnet) {
              let quality = "HD";
              const nameStr = item.title || "";
              if (/2160p|4k|uhd/i.test(nameStr)) quality = "2160p";
              else if (/1080p|fullhd/i.test(nameStr)) quality = "1080p";
              else if (/720p|hd/i.test(nameStr)) quality = "720p";
              else if (/480p|sd/i.test(nameStr)) quality = "480p";

              const sizeMb = item.size ? `${(item.size / (1024 * 1024 * 1024)).toFixed(2)} GB` : "";
              const seeds = item.swarm?.seeders ? `👤 ${item.swarm.seeders}` : "";

              streams.push({
                name: `[SolidTorrents] ${quality}`,
                title: item.title,
                metaText: [seeds, sizeMb].filter(Boolean).join(" • "),
                url: item.magnet,
                quality
              });
            }
          });
        }
      } catch (err) {
        console.warn("[TorrentScraper] SolidTorrents search warning:", err.message);
      }
    }

    return { streams };
  } catch (err) {
    console.error("[TorrentScraper] Error fetching torrent streams:", err);
    return { streams: [] };
  }
};
