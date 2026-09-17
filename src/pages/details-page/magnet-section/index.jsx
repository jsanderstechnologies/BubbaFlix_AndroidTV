/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { fetchTorrentStreams } from "../../../utils/torrentScraper";
import { getPremiumizeKey, resolveMagnetWithPremiumize } from "../../../utils/premiumize";
import { isTvDevice } from "../../../utils/zoom";
import ContentWrapper from "../../../components/content-wrapper";
import Spinner from "../../../components/spinner";
import VideoPlayerModal from "../../../components/video-player-modal";
import { FiPlay, FiChevronDown, FiChevronUp, FiAlertCircle, FiExternalLink, FiCloud } from "react-icons/fi";
import "./index.scss";

const isHevcOrX265Stream = (item) => {
  if (!item) return false;
  const fullStr = `${item.title || ""} ${item.name || ""} ${item.metaText || ""} ${item.url || ""}`;
  return /(hevc|x265|h265|h\.265)/i.test(fullStr);
};

const getHash = (url) => {
  if (!url) return null;
  const match = url.match(/urn:btih:([a-zA-Z0-9]+)/i);
  return match ? match[1].toLowerCase() : null;
};


const MagnetSection = ({ title, year, seasonNum, episodeNum, tmdbId, mediaType, compact = false, posterPath = "" }) => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Closed by default
  const [unconfigured, setUnconfigured] = useState(false);
  const [streamStatuses, setStreamStatuses] = useState({});

  // Streaming state

  const [showPlayer, setShowPlayer] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeFilename, setActiveFilename] = useState("");

  useEffect(() => {
    let interval;
    if (isOpen && streams.length > 0) {
      const updateStatuses = async () => {
        try {
          const hashes = streams.map(s => getHash(s.url)).filter(Boolean);
          if (hashes.length === 0) return;

          const [{ checkPremiumizeCache, getPremiumizeTransfers }] = await Promise.all([
             import("../../../utils/premiumize")
          ]);

          const [cacheRes, transfersRes] = await Promise.all([
            checkPremiumizeCache(hashes),
            getPremiumizeTransfers()
          ]);

          const newStatuses = {};
          hashes.forEach((hash, idx) => {
            const isCached = cacheRes[idx];
            let transferStatus = null;
            
            if (Array.isArray(transfersRes)) {
              const activeTransfer = transfersRes.find(t => 
                (t.src && t.src.toLowerCase().includes(hash)) || 
                (t.hash && t.hash.toLowerCase() === hash) ||
                (t.id && t.id.toLowerCase() === hash)
              );

              if (activeTransfer) {
                transferStatus = {
                  progress: activeTransfer.progress,
                  status: activeTransfer.status,
                  message: activeTransfer.message
                };
              }
            }

            newStatuses[hash] = { isCached, transferStatus };
          });

          setStreamStatuses(newStatuses);
        } catch (err) {
          console.error("[MagnetSection] Status check failed", err);
        }
      };

      updateStatuses();
      interval = setInterval(updateStatuses, 10000); // Poll every 10 seconds
    }
    return () => clearInterval(interval);
  }, [isOpen, streams]);
  
  useEffect(() => {
    if (title || tmdbId) {
      loadStreams();
    }
  }, [title, tmdbId, year, seasonNum, episodeNum]);

  const loadStreams = async () => {
    setLoading(true);
    setUnconfigured(false);

    const hasPremKey = !!getPremiumizeKey();
    if (!hasPremKey) {
      // Check if server settings have Premiumize key
      const { fetchServerSettings } = await import("../../../utils/serverSettings");
      const serverSettings = await fetchServerSettings();
      if (!serverSettings?.premiumizeKey) {
        setUnconfigured(true);
      }
    }

    const res = await fetchTorrentStreams({
      tmdbId,
      mediaType: mediaType || (seasonNum !== undefined ? "tv" : "movie"),
      seasonNum,
      episodeNum,
      title,
      year,
    });

    setLoading(false);

    let finalStreams = res.streams || [];

    // Fetch Server Settings for stream resolutions and low-quality filter preferences
    const { fetchServerSettings } = await import("../../../utils/serverSettings");
    const serverSettings = await fetchServerSettings();

    const allowedResolutions = (
      localStorage.getItem("stream_resolutions")
        ? JSON.parse(localStorage.getItem("stream_resolutions"))
        : null
    ) || serverSettings?.stream_resolutions || ["2160p", "1080p", "720p", "480p"];

    const excludeLowQuality = (
      localStorage.getItem("stream_exclude_low_quality") !== null
        ? JSON.parse(localStorage.getItem("stream_exclude_low_quality"))
        : null
    ) ?? serverSettings?.stream_exclude_low_quality ?? true;

    // Parse stream resolution
    const parseStreamResolution = (item) => {
      const fullStr = `${item.quality || ""} ${item.title || ""} ${item.name || ""} ${item.metaText || ""}`;
      if (/\b(4k|2160p|uhd|remux)\b/i.test(fullStr)) return "2160p";
      if (/\b(1080p|fhd|fullhd)\b/i.test(fullStr)) return "1080p";
      if (/\b(720p|hd)\b/i.test(fullStr)) return "720p";
      if (/\b(480p|sd|360p|240p)\b/i.test(fullStr)) return "480p";
      return "1080p";
    };

    const isLowQualityCamRelease = (item) => {
      const fullStr = `${item.title || ""} ${item.name || ""} ${item.metaText || ""}`;
      return /\b(hdcam|camrip|cam|telesync|tele-sync|hd-ts|hdts|workprint|screener|dvdscr)\b/i.test(fullStr);
    };

    // Note: HEVC / x265 codec streams are allowed so the user can test transcoding.
    // The player's automatic fallback triggers backend transcode if direct playback fails.

    // Apply Resolution & Quality Filtering
    finalStreams = finalStreams.filter((item) => {
      if (excludeLowQuality && isLowQualityCamRelease(item)) {
        return false;
      }
      const itemRes = parseStreamResolution(item);
      return allowedResolutions.includes(itemRes);
    });

    setStreams(finalStreams);
  };

  const handlePlayStream = async (item, transcodeMode = false) => {
    if (!item || !item.url) return;

    let targetUrl = item.url;

    // Auto-resolve magnet link via Premiumize Cloud API (adds to 7-day cloud retention)
      let premErrorMsg = "Magnet streams require a Premiumize API key to instantly resolve to HTTP.\n\nPlease save your Premiumize API Key in Settings to play this stream.";
      if (targetUrl.startsWith("magnet:")) {
        console.log("[MagnetSection] Resolving magnet via Premiumize Cloud API...");
        const premRes = await resolveMagnetWithPremiumize(targetUrl, null, seasonNum, episodeNum);
        if (premRes.success && premRes.streamUrl) {
          targetUrl = premRes.streamUrl;
          console.log("[MagnetSection] Successfully resolved Premiumize HTTP CDN stream URL:", targetUrl);
        } else if (premRes.message) {
          console.warn("[MagnetSection Premiumize Notice]:", premRes.message);
          premErrorMsg = premRes.message;
        }
      }

      if (targetUrl.startsWith("magnet:")) {
        alert(premErrorMsg);
        return;
      }

    const streamUrl = transcodeMode
      ? `/api/transcode?url=${encodeURIComponent(targetUrl)}`
      : targetUrl;

    setActiveVideoUrl(streamUrl);
    setActiveFilename(item.title || title);
    setShowPlayer(true);
  };

  if (!loading && streams.length === 0 && !unconfigured) {
    return null;
  }

  const content = (
    <div className="magnetSection">
      <div className={`sectionCard ${compact ? "compact" : ""}`}>
        <div
          className="sectionHeader"
          tabIndex="0"
          role="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            const code = e.keyCode;
            if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        >
          <div className="headerLeft">
            <span className="sectionTitle">Available Streams</span>
            {streams.length > 0 && (
              <span className="countBadge">{streams.length} Available</span>
            )}
            {unconfigured && (
              <span className="countBadge warning">Setup Required</span>
            )}
          </div>
          <button className="toggleBtn" tabIndex="-1">
            {isOpen ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>

        {isOpen && (
          <div className="sectionBody">
            {loading ? (
              <div className="loadingContainer">
                <Spinner />
              </div>
            ) : streams.length === 0 ? (
              <div className="unconfiguredNotice">
                <FiAlertCircle className="icon" />
                <div className="noticeText">
                  <h4>No Torrent Streams Found</h4>
                  <p>
                    {unconfigured
                      ? "Please enter your Premiumize API Key in Settings to resolve magnet torrent streams."
                      : "No torrent streams found for this title. You can try refreshing streams or check your search criteria."}
                  </p>
                  <button className="configBtn" onClick={loadStreams} style={{ cursor: "pointer" }}>
                    Refresh Streams
                  </button>
                </div>
              </div>
            ) : (
              <div className="magnetList">
                {streams.map((item, index) => (
                  <div key={index} className="magnetItem">
                    <div className="itemInfo">
                      <span className="itemTitle" title={item.title}>
                        {item.title}
                      </span>
                      <div className="itemMeta">
                        <span className="metaBadge provider">⚡ {item.name}</span>
                        {item.metaText && (
                          <span className="metaBadge info">{item.metaText}</span>
                        )}
                      
                          {(() => {
                            const h = getHash(item.url);
                            const stat = h ? streamStatuses[h] : null;
                            if (!stat) return null;
                            
                            const badges = [];
                            if (stat.transferStatus && stat.transferStatus.status === "downloading") {
                                badges.push(<span key="dl" className="metaBadge info" style={{ background: '#ffc107', color: '#000', fontWeight: 'bold' }}>Downloading: {Math.round((stat.transferStatus.progress || 0) * 100)}%</span>);
                            } else if (stat.transferStatus && stat.transferStatus.status === "finished") {
                                badges.push(<span key="fin" className="metaBadge success" style={{ background: '#28a745', color: '#fff', fontWeight: 'bold' }}>Finished / Cached</span>);
                            } else if (stat.isCached) {
                                badges.push(<span key="cached" className="metaBadge success" style={{ background: '#28a745', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><FiCloud /> Cached</span>);
                            } else if (stat.transferStatus && stat.transferStatus.status === "error") {
                                badges.push(<span key="err" className="metaBadge error" style={{ background: '#dc3545', color: '#fff', fontWeight: 'bold' }}>Transfer Error</span>);
                            } else if (stat.transferStatus && stat.transferStatus.status === "waiting") {
                                badges.push(<span key="wait" className="metaBadge info" style={{ background: '#17a2b8', color: '#fff', fontWeight: 'bold' }}>Waiting to start...</span>);
                            }
                            
                            return badges;
                          })()}
                        </div>
                    </div>

                    <div className="itemActions">
                      <button
                        className="actionBtn play"
                        onClick={() => handlePlayStream(item, false)}
                      >
                        <FiPlay /> Play
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <VideoPlayerModal
          show={showPlayer}
          setShow={setShowPlayer}
          videoUrl={activeVideoUrl}
          rawUrl={activeVideoUrl}
          title={activeFilename}
          tmdbId={tmdbId}
          mediaType={mediaType || (seasonNum !== undefined ? "tv" : "movie")}
          seasonNum={seasonNum}
          episodeNum={episodeNum}
          posterPath={posterPath}
        />
      </div>
    </div>
  );

  if (compact) {
    return content;
  }

  return <ContentWrapper>{content}</ContentWrapper>;
};

export default MagnetSection;
