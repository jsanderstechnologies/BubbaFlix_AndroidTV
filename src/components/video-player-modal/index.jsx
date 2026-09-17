/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { FiArrowLeft } from "react-icons/fi";
import { getWatchProgress, saveWatchProgress, saveStreamUrl, forceSyncProgressToServer } from "../../utils/watchProgress";
import { getTranscodedStreamUrl } from "../../utils/serverSettings";
import "./index.scss";

import CustomTranscodePlayer from "./CustomTranscodePlayer";

const cleanMediaTitle = (rawTitle) => {
  if (!rawTitle) return "";
  let clean = rawTitle;
  clean = clean.replace(/\.(mkv|mp4|avi|mov|m4v|wmv|flv|webm)$/i, "");
  clean = clean.replace(/[\._\+]/g, " ");
  clean = clean.replace(/\b(1080p|720p|2160p|4k|hdr|web-dl|webrip|h264|x264|h265|hevc|repack|proper|aac|dts|xvid|ethel|eztv|eztvx|rarbg|yts)\b/gi, "");
  clean = clean.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "");
  clean = clean.replace(/\s+/g, " ").trim();
  return clean || rawTitle;
};

const VideoPlayerModal = ({ show = true, setShow, onClose, videoUrl, rawUrl, streamUrl, title, tmdbId, mediaType = "movie", seasonNum, episodeNum, channelLogo, posterPath = "" }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const [currentUrl, setCurrentUrl] = useState("");
  const [showControls, setShowControls] = useState(true);
  const [fetchedLogo, setFetchedLogo] = useState(null);
  const controlsTimeoutRef = useRef(null);
  
  const displayTitle = cleanMediaTitle(title || "");

  const handleClose = () => {
    if (videoRef.current) {
      const v = videoRef.current;
      if (v.currentTime > 15 && v.duration > 0) {
         saveWatchProgress({
            tmdbId,
            mediaType,
            seasonNum,
            episodeNum,
            currentTime: v.currentTime,
            duration: v.duration,
            title: displayTitle,
            posterPath,
         });
         if (videoUrl) saveStreamUrl(tmdbId, mediaType, seasonNum, episodeNum, videoUrl);
      }
    }
    forceSyncProgressToServer();
    if (typeof setShow === "function") setShow(false);
    if (typeof onClose === "function") onClose();
  };

  useEffect(() => {
    if (!show || !tmdbId || channelLogo) return;
    const fetchLogo = async () => {
      try {
        const { fetchDataFromAPI } = await import("../../utils/api");
        const res = await fetchDataFromAPI(`/${mediaType || 'movie'}/${tmdbId}/images`, { include_image_language: "en,null" });
        if (res && res.logos && res.logos.length > 0) {
          const { getProxiedImageUrl } = await import("../../utils/serverSettings");
          setFetchedLogo(getProxiedImageUrl(`https://image.tmdb.org/t/p/w500${res.logos[0].file_path}`));
        }
      } catch (err) {
        console.warn("Failed to fetch TMDB logo in modal", err);
      }
    };
    fetchLogo();
  }, [show, tmdbId, mediaType, channelLogo]);

  const handleControlsToggle = (visible) => {
    setShowControls(visible);
    if (visible && controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  useEffect(() => {
    if (show) {
      let targetUrl = getTranscodedStreamUrl(rawUrl || videoUrl || streamUrl || "");

      if (window.AndroidPlayer && typeof window.AndroidPlayer.playStream === "function") {
        window.AndroidPlayer.playStream(
          targetUrl,
          displayTitle || "",
          fetchedLogo || channelLogo || "",
          String(tmdbId || ""),
          mediaType || "movie"
        );
        if (typeof setShow === "function") setShow(false);
        if (typeof onClose === "function") onClose();
        return;
      }

      document.body.classList.add("videoPlayerActive");
      document.documentElement.classList.add("videoPlayerActive");
      setCurrentUrl(targetUrl);

      const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
      };

      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);

      window.addEventListener("mousemove", handleMouseMove);

      const handlePlayerKeyDown = (e) => {
        const key = e.key;
        const code = e.keyCode;
        if (key === "Escape" || key === "Back" || code === 27 || code === 4 || code === 10009 || code === 461) {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }
      };

      window.addEventListener("keydown", handlePlayerKeyDown, true);

      return () => {
        window.removeEventListener("keydown", handlePlayerKeyDown, true);
        window.removeEventListener("mousemove", handleMouseMove);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        document.body.classList.remove("videoPlayerActive");
        document.documentElement.classList.remove("videoPlayerActive");
      };
    } else {
      document.body.classList.remove("videoPlayerActive");
      document.documentElement.classList.remove("videoPlayerActive");
    }
  }, [show, videoUrl, rawUrl, tmdbId, mediaType]);

  useEffect(() => {
    if (!show || !currentUrl || !videoRef.current) return;
    const videoNode = videoRef.current;

    const handleLoadedData = () => {
       const saved = getWatchProgress(tmdbId, mediaType, seasonNum, episodeNum);
       if (saved && saved.currentTime > 15 && (saved.duration - saved.currentTime) > 60) {
           videoNode.currentTime = saved.currentTime;
       }
    };

    videoNode.addEventListener("loadeddata", handleLoadedData);
    videoNode.src = currentUrl;

    return () => {
      videoNode.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [show, currentUrl, tmdbId, mediaType, seasonNum, episodeNum]);

  const handleTimeUpdate = (mockVideoNode) => {
     const v = mockVideoNode || videoRef.current;
     if (v && v.currentTime > 15 && v.duration > 0) {
         saveWatchProgress({
            tmdbId,
            mediaType,
            seasonNum,
            episodeNum,
            currentTime: v.currentTime,
            duration: v.duration,
            title: displayTitle,
            posterPath,
         });
     }
  };

  if (!show) return null;

  return createPortal(
    <div ref={containerRef} className={`videoPlayerModal ${show ? "visible" : ""}`}>
      <div className="playerWindow">
        <div style={{ 
          position: 'absolute', top: '15px', left: '15px', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '15px',
          opacity: showControls ? 1 : 0, 
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none'
        }}>
          <button 
             className="backBtn minimalistBackBtn" 
             onClick={handleClose}
             style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}
          >
            <FiArrowLeft size={20} /> Back
          </button>
          
          {(channelLogo || fetchedLogo) && (
            <img 
              src={channelLogo || fetchedLogo} 
              alt="Logo" 
              style={{ height: '90px', objectFit: 'contain', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }} 
            />
          )}
        </div>

        <div className="videoWrapper" style={{ width: '100%', height: '100vh', background: 'black' }}>
          <video
            ref={videoRef}
            className="videoElement"
            controls
            autoPlay
            onTimeUpdate={() => handleTimeUpdate()}
            onEnded={handleClose}
            src={currentUrl}
            style={{ width: '100%', height: '100%', outline: 'none' }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VideoPlayerModal;
