import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getServerUrl } from "../../utils/serverSettings";
import { getWatchProgress } from "../../utils/watchProgress";
import { fetchDataFromAPI } from "../../utils/api";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const languageMap = {
  eng: 'English', en: 'English',
  fre: 'French', fra: 'French', fr: 'French',
  spa: 'Spanish', es: 'Spanish',
  ger: 'German', deu: 'German', de: 'German',
  ita: 'Italian', it: 'Italian',
  jpn: 'Japanese', ja: 'Japanese',
  kor: 'Korean', ko: 'Korean',
  chi: 'Chinese', zho: 'Chinese', zh: 'Chinese',
  rus: 'Russian', ru: 'Russian',
  por: 'Portuguese', pt: 'Portuguese',
  hin: 'Hindi', hi: 'Hindi',
  pol: 'Polish', pl: 'Polish',
  ara: 'Arabic', ar: 'Arabic'
};

const formatLang = (lang) => {
  if (!lang || lang === 'und') return '';
  const l = lang.toLowerCase();
  return languageMap[l] || lang.toUpperCase();
};

const CustomTranscodePlayer = ({ streamUrl, rawUrl, title, tmdbId, mediaType, seasonNum, episodeNum, onTimeUpdate, onEnded, onControlsToggle }) => {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedAmount, setBufferedAmount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [seekOffset, setSeekOffset] = useState(0);
  const seekOffsetRef = useRef(0);
  const [showControls, setShowControls] = useState(true);
  const [actualStreamUrl, setActualStreamUrl] = useState("");
  const controlsTimeoutRef = useRef(null);

  const [audioTracks, setAudioTracks] = useState([]);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(null);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(null);
  const [mediaInfo, setMediaInfo] = useState({ resolution: "Unknown", videoCodec: "Unknown" });
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pendingSavedProgress, setPendingSavedProgress] = useState(null);

  useEffect(() => {
    if (!streamUrl) return;
    const saved = getWatchProgress(tmdbId, mediaType, seasonNum, episodeNum);
    if (saved && saved.currentTime > 15 && (saved.duration - saved.currentTime) > 60) {
      setPendingSavedProgress(saved);
      setShowResumePrompt(true);
    } else {
      setActualStreamUrl(streamUrl);
    }
  }, [streamUrl, tmdbId, mediaType, seasonNum, episodeNum]);

  useEffect(() => {
    let abortController = new AbortController();
    let track = null;
    
    if (selectedSubtitleIndex !== null && videoRef.current) {
      // Find existing track or add one
      let existingTrack = Array.from(videoRef.current.textTracks || []).find(t => t.label === "CustomSub");
      if (!existingTrack) {
        track = videoRef.current.addTextTrack("subtitles", "CustomSub", "en");
      } else {
        track = existingTrack;
        if (track.cues) {
          Array.from(track.cues).forEach(c => track.removeCue(c));
        }
      }
      
      // Hide all other tracks
      if (videoRef.current.textTracks) {
        for (let i = 0; i < videoRef.current.textTracks.length; i++) {
          if (videoRef.current.textTracks[i] !== track) {
            videoRef.current.textTracks[i].mode = 'disabled';
          }
        }
      }
      
      track.mode = "showing";
      
      const loadSubs = async () => {
         try {
            const serverBase = getServerUrl();
            const url = `${serverBase}/api/transcode/subtitle?url=${encodeURIComponent(rawUrl)}&index=${selectedSubtitleIndex}`;
            const response = await fetch(url, { signal: abortController.signal });
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            
            const parseTime = (timeStr) => {
              if (!timeStr) return 0;
              // Clean settings after timestamp like position:50% or align:middle and replace commas
              const cleanStr = timeStr.trim().split(/\s+/)[0].replace(',', '.');
              const p = cleanStr.split(':');
              let s = parseFloat(p.pop() || 0);
              let m = parseInt(p.pop() || 0);
              let h = parseInt(p.pop() || 0);
              if (isNaN(s)) s = 0;
              if (isNaN(m)) m = 0;
              if (isNaN(h)) h = 0;
              return h * 3600 + m * 60 + s;
            };

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              let parts = buffer.split(/\n\r?\n/);
              buffer = parts.pop();
              
              for (let part of parts) {
                 if (part.includes('-->')) {
                     const lines = part.split(/\r?\n/);
                     let timeLineIdx = lines.findIndex(l => l.includes('-->'));
                     if (timeLineIdx === -1) continue;
                     
                     let text = lines.slice(timeLineIdx + 1).join('\n').trim();
                     let [startStr, endStr] = lines[timeLineIdx].split('-->');
                     let start = parseTime(startStr);
                     let end = parseTime(endStr);
                     
                     start = Math.max(0, start - seekOffsetRef.current);
                     end = Math.max(0, end - seekOffsetRef.current);
                     
                     if (!isNaN(start) && !isNaN(end) && end > start && window.VTTCue) {
                       try {
                         track.addCue(new VTTCue(start, end, text));
                       } catch (e) {
                         // ignore invalid cue errors
                       }
                     }
                 }
              }
            }
         } catch (e) {
            if (e.name !== 'AbortError') {
              console.error("Subtitle load error:", e);
            }
         }
      };
      loadSubs();
    } else if (selectedSubtitleIndex === null && videoRef.current && videoRef.current.textTracks) {
      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
        videoRef.current.textTracks[i].mode = 'disabled';
      }
    }
    
    return () => {
       abortController.abort();
    };
  }, [selectedSubtitleIndex, actualStreamUrl]);

  const executeSeek = (targetTime, audioIndex = selectedAudioIndex, vCodec = mediaInfo.videoCodec) => {
    setSeekOffset(targetTime);
    seekOffsetRef.current = targetTime;
    setCurrentTime(targetTime);
    
    let targetUrl = streamUrl;
    if (targetTime > 0) targetUrl += (targetUrl.includes("?") ? "&" : "?") + `ss=${targetTime}`;
    if (audioIndex !== null) targetUrl += (targetUrl.includes("?") ? "&" : "?") + `audio_index=${audioIndex}`;
    if (vCodec && vCodec !== "Unknown") targetUrl += (targetUrl.includes("?") ? "&" : "?") + `video_codec=${vCodec}`;
    
    setActualStreamUrl(targetUrl);
    if (videoRef.current) {
      videoRef.current.src = targetUrl;
      videoRef.current.play();
    }
  };

  const handleResumeChoice = (resume) => {
    setShowResumePrompt(false);
    let startOffset = 0;
    if (resume && pendingSavedProgress) {
      startOffset = pendingSavedProgress.currentTime;
    }
    executeSeek(startOffset);
  };


  useEffect(() => {
    if (!rawUrl || !streamUrl) return;
    // Reset selections on new video load
    let isCancelled = false;
    setSelectedAudioIndex(null);
    setSelectedSubtitleIndex(null);
    setAudioTracks([]);
    setSubtitleTracks([]);
    setChapters([]);
    setMediaInfo({ resolution: "Unknown", videoCodec: "Unknown" });

    const fetchMetadata = async () => {
      try {
        const serverBase = getServerUrl();
        const res = await axios.get(`${serverBase}/api/transcode/metadata?url=${encodeURIComponent(rawUrl)}`, { timeout: 10000 });
        if (isCancelled) return;
        
        if (res.data) {
          if (res.data.duration) setDuration(res.data.duration);
          if (res.data.subtitleTracks) {
            let allSubs = res.data.subtitleTracks.map(t => {
              let displayTitle = t.title || `Subtitle Track ${t.index}`;
              if (t.forced && !displayTitle.toLowerCase().includes('forced')) {
                displayTitle = `${displayTitle} [Forced]`;
              }
              return { ...t, title: displayTitle };
            });
            
            setSubtitleTracks(allSubs);

            const defaultForcedSub = allSubs.find(t => t.forced || (t.title && t.title.toLowerCase().includes('forced')));
            const defaultEngSub = allSubs.find(t => t.language === 'eng' || t.language === 'en' || (t.title && t.title.toLowerCase().includes('english')));
            
            if (defaultForcedSub) {
              setSelectedSubtitleIndex(defaultForcedSub.index);
            } else if (defaultEngSub) {
              setSelectedSubtitleIndex(defaultEngSub.index);
            }
          }
          if (res.data.chapters) setChapters(res.data.chapters);
          if (res.data.resolution || res.data.videoCodec) {
            setMediaInfo({ resolution: res.data.resolution || "Unknown", videoCodec: res.data.videoCodec || "Unknown" });
          }
          
          let finalUrl = streamUrl;
          const currentRealTime = seekOffsetRef.current + (videoRef.current ? videoRef.current.currentTime : 0);
          let shouldUpdatePlayer = false;

          if (res.data.audioTracks && res.data.audioTracks.length > 0) {
            setAudioTracks(res.data.audioTracks);
            // Default to English track on new video load
            const engTrack = res.data.audioTracks.find(t => t.language === 'eng' || t.language === 'en' || (t.title && t.title.toLowerCase().includes('english')));
            if (engTrack && res.data.audioTracks[0] && engTrack.index !== res.data.audioTracks[0].index) {
              setSelectedAudioIndex(engTrack.index);
              setSeekOffset(currentRealTime);
              setCurrentTime(currentRealTime);
              if (currentRealTime > 0) finalUrl += (finalUrl.includes("?") ? "&" : "?") + `ss=${currentRealTime}`;
              finalUrl += (finalUrl.includes("?") ? "&" : "?") + `audio_index=${engTrack.index}`;
              shouldUpdatePlayer = true;
            } else {
              setSelectedAudioIndex(null);
            }
          } else {
            setSelectedAudioIndex(null);
          }

          if (shouldUpdatePlayer) {
             setActualStreamUrl(finalUrl);
             if (videoRef.current) {
                const isPlaying = !videoRef.current.paused;
                videoRef.current.src = finalUrl;
                if (currentRealTime > 0) videoRef.current.currentTime = currentRealTime;
                if (isPlaying) videoRef.current.play();
             }
          }
        }
      } catch (err) {
        if (!isCancelled) console.warn("[CustomTranscodePlayer] Failed to probe metadata:", err.message);
      }
    };
    fetchMetadata();
    
    return () => {
      isCancelled = true;
    };
  }, [rawUrl, streamUrl]);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (onControlsToggle) onControlsToggle(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => { setShowControls(false); if (onControlsToggle) onControlsToggle(false); }, 3000);
    };
    
    const handleKeyDown = (e) => {
      handleMouseMove();

      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "BUTTON" || activeEl.closest('.custom-controls'))) {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", " "].includes(e.key)) {
          return; // Let native spatial navigation or default button click take over
        }
      }

      if (e.key === "ArrowRight") {
        setSeekOffset((prev) => {
          let target = currentTime + 10;
          if (duration > 0 && target > duration) target = duration;
          executeSeek(target);
          return prev;
        });
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        setSeekOffset((prev) => {
          let target = currentTime - 10;
          if (target < 0) target = 0;
          executeSeek(target);
          return prev;
        });
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        togglePlay();
        e.preventDefault();
      } else if (e.key === "MediaPlayPause" || e.key === "MediaPlay" || e.key === "MediaPause") {
        togglePlay();
        e.preventDefault();
      } else if (e.key === "MediaFastForward") {
        setSeekOffset((prev) => {
          let target = currentTime + 10;
          if (duration > 0 && target > duration) target = duration;
          executeSeek(target);
          return prev;
        });
        e.preventDefault();
      } else if (e.key === "MediaRewind") {
        setSeekOffset((prev) => {
          let target = currentTime - 10;
          if (target < 0) target = 0;
          executeSeek(target);
          return prev;
        });
        e.preventDefault();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentTime, duration, selectedAudioIndex, streamUrl]);

  useEffect(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => { setShowControls(false); if (onControlsToggle) onControlsToggle(false); }, 3000);
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [onControlsToggle]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const realTime = seekOffset + videoRef.current.currentTime;
      setCurrentTime(realTime);
      if (onTimeUpdate) {
        onTimeUpdate({ currentTime: realTime, duration });
      }
    }
  };

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBufferedAmount(seekOffset + bufferedEnd);
    }
  };



  const handleSeek = (e) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const targetTime = pos * duration;
    executeSeek(targetTime);
  };

  const handleRelativeSeek = (seconds) => {
    if (duration <= 0) return;
    let targetTime = currentTime + seconds;
    if (targetTime < 0) targetTime = 0;
    if (targetTime > duration) targetTime = duration;
    executeSeek(targetTime);
  };

  const handleAudioTrackChange = (index) => {
    setSelectedAudioIndex(index);
    setShowAudioMenu(false);
    executeSeek(currentTime, index);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    if (showAudioMenu) {
      setTimeout(() => { const btn = document.querySelector('.audio-menu-btn'); if (btn) btn.focus(); }, 100);
    }
  }, [showAudioMenu]);

  useEffect(() => {
    if (showSubtitleMenu) {
      setTimeout(() => { const btn = document.querySelector('.sub-menu-btn'); if (btn) btn.focus(); }, 100);
    }
  }, [showSubtitleMenu]);

  useEffect(() => {
    if (showChapterMenu) {
      setTimeout(() => { const btn = document.querySelector('.chapter-menu-btn'); if (btn) btn.focus(); }, 100);
    }
  }, [showChapterMenu]);

  return (
    <div className="custom-transcode-player" style={{ position: 'relative', width: '100%', height: '100%', background: 'black', overflow: 'hidden' }}>
      
      {showResumePrompt && pendingSavedProgress && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <h2 style={{ color: 'white', marginBottom: 20 }}>Resume Playback?</h2>
          <p style={{ color: '#ccc', marginBottom: 30, fontSize: 16 }}>
            You left off at {formatTime(pendingSavedProgress.currentTime)}. Would you like to resume?
          </p>
          <div style={{ display: 'flex', gap: 15 }}>
            <button 
              autoFocus
              onClick={() => handleResumeChoice(true)}
              style={{ padding: '12px 24px', background: 'var(--pink)', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', outline: 'none' }}
              onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.5)'}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
            >
              Resume
            </button>
            <button 
              onClick={() => handleResumeChoice(false)}
              style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 8, fontSize: 16, cursor: 'pointer', outline: 'none' }}
              onFocus={(e) => e.target.style.boxShadow = '0 0 0 3px rgba(255,255,255,0.5)'}
              onBlur={(e) => e.target.style.boxShadow = 'none'}
            >
              Start Over
            </button>
          </div>
        </div>
      )}

      {actualStreamUrl && (
        <video
          ref={videoRef}
          autoPlay
          src={actualStreamUrl}
          onTimeUpdate={handleTimeUpdate}
          onProgress={handleProgress}
          onEnded={onEnded}
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={{ width: '100%', height: '100%', outline: 'none' }}
          crossOrigin="anonymous"
        >
          {selectedSubtitleIndex !== null && (
            <track 
              key={`${selectedSubtitleIndex}-${seekOffset}`}
              kind="subtitles" 
              src={`${getServerUrl()}/api/transcode/subtitle?url=${encodeURIComponent(rawUrl)}&index=${selectedSubtitleIndex}&ss=${seekOffset}`} 
              srcLang="en" 
              label="Subtitle" 
              default 
            />
          )}
        </video>
      )}
      
      <div 
        className="custom-controls" 
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          padding: '30px 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px',
          color: 'white', transition: 'opacity 0.3s ease',
          opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none'
        }}
      >
        <div style={{ paddingBottom: '10px', fontSize: '18px', fontWeight: 'bold', textShadow: '1px 1px 2px black', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
        </div>
        
        <div className="progress-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>{formatTime(currentTime)}</span>
          <div 
            className="progress-bar" 
            onClick={handleSeek} 
            style={{
              flex: 1, height: '8px', background: 'rgba(255,255,255,0.25)', 
              cursor: 'pointer', borderRadius: '4px', position: 'relative'
            }}
          >
            {chapters.map(chap => (
              <div 
                key={chap.id}
                style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${duration ? (chap.start_time / duration) * 100 : 0}%`,
                  width: '2px', background: 'rgba(255,255,255,0.8)', zIndex: 3
                }}
                title={chap.title}
              />
            ))}
            <div className="buffered-filled" style={{
              position: 'absolute', top: 0, left: 0,
              width: `${duration ? (bufferedAmount / duration) * 100 : 0}%`,
              height: '100%', background: 'rgba(255,255,255,0.4)', borderRadius: '4px',
              transition: 'width 0.2s linear', zIndex: 1
            }} />
            <div className="progress-filled" style={{
              position: 'absolute', top: 0, left: 0,
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              height: '100%', background: '#E50914', borderRadius: '4px',
              transition: 'width 0.1s linear', zIndex: 2
            }} />
          </div>
          <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>{formatTime(duration)}</span>
        </div>
        
        <div className="controls-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button onClick={() => handleRelativeSeek(-30)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              ⏪ 30s
            </button>
            <button onClick={() => handleRelativeSeek(-10)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              ⏪ 10s
            </button>
            <button onClick={togglePlay} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '24px' }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={() => handleRelativeSeek(10)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              10s ⏩
            </button>
            <button onClick={() => handleRelativeSeek(30)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              30s ⏩
            </button>
          </div>

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            
            <div style={{ position: 'relative' }}>
              {showInfoModal && (
                <div style={{ position: 'absolute', bottom: '35px', right: '-10px', background: 'rgba(20,20,20,0.95)', padding: '15px', borderRadius: '8px', minWidth: '250px', zIndex: 100, border: '1px solid #444' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Media Info</div>
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}><strong>Title:</strong> {title}</div>
                  {mediaType === 'tv' && (
                    <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}><strong>Episode:</strong> S{seasonNum} E{episodeNum}</div>
                  )}
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}><strong>Duration:</strong> {formatTime(duration)}</div>
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}><strong>Forward Buffer:</strong> {Math.max(0, Math.round(bufferedAmount - currentTime))}s ahead</div>
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}><strong>Resolution:</strong> {mediaInfo?.resolution}</div>
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}><strong>Video Codec:</strong> {mediaInfo?.videoCodec}</div>
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}><strong>Transcoder:</strong> Active (FFmpeg Pipe)</div>
                </div>
              )}
              <button onClick={() => { setShowInfoModal(!showInfoModal); setShowChapterMenu(false); setShowAudioMenu(false); setShowSubtitleMenu(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>
                ℹ️ Info
              </button>
            </div>

            {chapters.length > 0 && (
              <div style={{ position: 'relative' }}>
                {showChapterMenu && (
                  <div style={{ position: 'absolute', bottom: '35px', right: '-10px', background: 'rgba(20,20,20,0.95)', padding: '10px', borderRadius: '8px', minWidth: '200px', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 100 }}>
                    <div style={{ fontSize: '12px', color: '#aaa', paddingBottom: '5px', borderBottom: '1px solid #444', marginBottom: '5px' }}>Chapters</div>
                    {chapters.map((chap, i) => (
                      <button key={chap.id} className={i === 0 ? "chapter-menu-btn" : ""} onClick={() => { executeSeek(chap.start_time); setShowChapterMenu(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', padding: '5px' }}>
                        {formatTime(chap.start_time)} - {chap.title}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => { setShowChapterMenu(!showChapterMenu); setShowInfoModal(false); setShowAudioMenu(false); setShowSubtitleMenu(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>
                  📑 Chapters
                </button>
              </div>
            )}

            {audioTracks.length > 0 && (
              <div style={{ position: 'relative' }}>
                {showAudioMenu && (
                  <div style={{ position: 'absolute', bottom: '35px', right: '-10px', background: 'rgba(20,20,20,0.95)', padding: '10px', borderRadius: '8px', minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 100 }}>
                    <div style={{ fontSize: '12px', color: '#aaa', paddingBottom: '5px', borderBottom: '1px solid #444', marginBottom: '5px' }}>Audio Tracks</div>
                    <button className="audio-menu-btn" onClick={() => handleAudioTrackChange(null)} style={{ background: 'none', border: 'none', color: selectedAudioIndex === null ? '#E50914' : 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', padding: '5px' }}>
                      Default Track
                    </button>
                    {audioTracks.map(t => (
                      <button key={t.index} onClick={() => handleAudioTrackChange(t.index)} style={{ background: 'none', border: 'none', color: selectedAudioIndex === t.index ? '#E50914' : 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', padding: '5px' }}>
                        {t.title} {formatLang(t.language) ? `(${formatLang(t.language)})` : ''}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => { setShowAudioMenu(!showAudioMenu); setShowInfoModal(false); setShowSubtitleMenu(false); setShowChapterMenu(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>
                  🔊 Audio
                </button>
              </div>
            )}
            
            {subtitleTracks.length > 0 && (
              <div style={{ position: 'relative' }}>
                {showSubtitleMenu && (
                  <div style={{ position: 'absolute', bottom: '35px', right: '-10px', background: 'rgba(20,20,20,0.95)', padding: '10px', borderRadius: '8px', minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 100 }}>
                    <div style={{ fontSize: '12px', color: '#aaa', paddingBottom: '5px', borderBottom: '1px solid #444', marginBottom: '5px' }}>Subtitles (CC)</div>
                    <button className="sub-menu-btn" onClick={() => { setSelectedSubtitleIndex(null); setShowSubtitleMenu(false); }} style={{ background: 'none', border: 'none', color: selectedSubtitleIndex === null ? '#E50914' : 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', padding: '5px' }}>
                      Off
                    </button>
                    {subtitleTracks.map(t => (
                      <button key={t.index} onClick={() => { setSelectedSubtitleIndex(t.index); setShowSubtitleMenu(false); }} style={{ background: 'none', border: 'none', color: selectedSubtitleIndex === t.index ? '#E50914' : 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', padding: '5px' }}>
                        {t.title} {formatLang(t.language) ? `(${formatLang(t.language)})` : ''}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => { setShowSubtitleMenu(!showSubtitleMenu); setShowInfoModal(false); setShowAudioMenu(false); setShowChapterMenu(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                  CC
                </button>
              </div>
            )}

            <button onClick={handleToggleFullscreen} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>
              ⛶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomTranscodePlayer;
