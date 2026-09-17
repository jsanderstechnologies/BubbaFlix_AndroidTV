import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import { fetchDataFromAPI, getActiveTmdbToken } from "../../utils/api";
import { getSimklConfig, testSimklConnection } from "../../utils/simkl";
import { getGroqApiKey, saveGroqApiKey } from "../../utils/groqFilter";
import { getPremiumizeKey, savePremiumizeKey } from "../../utils/premiumize";
import { updateServerSettings, fetchServerSettings } from "../../utils/serverSettings";
import { getApiConfiguration } from "../../store/homeSlice";
import { THEMES, getSavedTheme, applyTheme } from "../../utils/theme";
import { getHomeSections, saveHomeSections, DEFAULT_HOME_SECTIONS } from "../../utils/homeConfig";
import { FiKey, FiCheck, FiCheckCircle, FiXCircle, FiSave, FiRefreshCw, FiEye, FiEyeOff, FiSliders, FiSun, FiCpu, FiCloudLightning, FiTv, FiInfo, FiChevronUp, FiChevronDown, FiRotateCcw } from "react-icons/fi";
import "./index.scss";

const ALL_RESOLUTIONS = [
  { id: "2160p", label: "4K / 2160p (UHD)" },
  { id: "1080p", label: "1080p (Full HD)" },
  { id: "720p", label: "720p (HD)" },
  { id: "480p", label: "480p / SD" },
];

const SettingsPage = () => {
  const [activeTheme, setActiveTheme] = useState("dark-red");

  // Premiumize.me API State
  const [premiumizeKey, setPremiumizeKey] = useState("");
  const [showPremiumizeKey, setShowPremiumizeKey] = useState(false);
  const [premiumizeStatus, setPremiumizeStatus] = useState(null);

  // TMDB Key State
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [testing, setTesting] = useState(false);

  // SIMKL State
  const [simklClientId, setSimklClientId] = useState("");
  const [simklClientSecret, setSimklClientSecret] = useState("");
  const [showSimklSecret, setShowSimklSecret] = useState(false);
  const [simklStatus, setSimklStatus] = useState(null);
  const [testingSimkl, setTestingSimkl] = useState(false);

  // Groq AI Key State
  const [groqKey, setGroqKey] = useState("");
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [groqStatus, setGroqStatus] = useState(null);

  // Dispatcharr Live TV State
  const [dispatcharrUrl, setDispatcharrUrl] = useState("");
  const [dispatcharrApiKey, setDispatcharrApiKey] = useState("");
  const [showDispatcharrKey, setShowDispatcharrKey] = useState(false);
  const [dispatcharrStatus, setDispatcharrStatus] = useState(null);

  // Stream Resolution & Quality Filter State
  const [selectedResolutions, setSelectedResolutions] = useState(["2160p", "1080p", "720p", "480p"]);
  const [excludeLowQuality, setExcludeLowQuality] = useState(true);
  const [disableBackgrounds, setDisableBackgrounds] = useState(false);
  const [filterStatus, setFilterStatus] = useState(null);

  // Home Screen Layout Customization State
  const [homeSections, setHomeSections] = useState(getHomeSections());
  const [homeSectionStatus, setHomeSectionStatus] = useState(null);

  const dispatch = useDispatch();

  const loadAllSettings = async () => {
    const serverSettings = await fetchServerSettings();

    const currentTheme = serverSettings?.theme || getSavedTheme();
    setActiveTheme(currentTheme);
    applyTheme(currentTheme);

    const activeToken = localStorage.getItem("tmdb_token") || getActiveTmdbToken() || "";
    setToken(activeToken);

    const activeSimkl = localStorage.getItem("simkl_client_id") || getSimklConfig().clientId || "";
    setSimklClientId(activeSimkl);
    const activeSimklSecret = localStorage.getItem("simkl_client_secret") || getSimklConfig().clientSecret || "";
    setSimklClientSecret(activeSimklSecret);

    const activeGroq = getGroqApiKey() || "";
    setGroqKey(activeGroq);

    const activePrem = getPremiumizeKey() || "";
    setPremiumizeKey(activePrem);

    const activeDispUrl = localStorage.getItem("dispatcharr_url") || "";
    setDispatcharrUrl(activeDispUrl);
    const activeDispKey = localStorage.getItem("dispatcharr_api_key") || "";
    setDispatcharrApiKey(activeDispKey);

    const resConfig = (localStorage.getItem("stream_resolutions") ? JSON.parse(localStorage.getItem("stream_resolutions")) : null) || ["2160p", "1080p", "720p", "480p"];
    setSelectedResolutions(resConfig);

    const excludeLowConfig = localStorage.getItem("stream_exclude_low_quality") !== null ? JSON.parse(localStorage.getItem("stream_exclude_low_quality")) : true;
    setExcludeLowQuality(excludeLowConfig);
    
    const disableBgConfig = localStorage.getItem("disable_backgrounds") !== null ? JSON.parse(localStorage.getItem("disable_backgrounds")) : false;
    setDisableBackgrounds(disableBgConfig);

    setHomeSections(getHomeSections());
  };

  const handleToggleHomeSection = (id) => {
    const updated = homeSections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setHomeSections(updated);
  };

  const handleMoveHomeSection = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= homeSections.length) return;
    const updated = [...homeSections];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setHomeSections(updated);
  };

  const handleSaveHomeSections = async (e) => {
    if (e) e.preventDefault();
    saveHomeSections(homeSections);
    setHomeSectionStatus({ type: "success", text: "Home screen layout saved!" });
  };

  const handleResetHomeSections = async () => {
    setHomeSections(DEFAULT_HOME_SECTIONS);
    saveHomeSections(DEFAULT_HOME_SECTIONS);
    setHomeSectionStatus({ type: "info", text: "Home screen layout reset to defaults." });
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const handleSelectTheme = (themeId) => {
    setActiveTheme(themeId);
    applyTheme(themeId);
    updateServerSettings({ theme: themeId });
  };

  const handleToggleBackgrounds = (e) => {
    const val = e.target.checked;
    setDisableBackgrounds(val);
    localStorage.setItem("disable_backgrounds", JSON.stringify(val));
  };

  const refreshConfig = async () => {
    try {
      const res = await fetchDataFromAPI("/configuration");
      if (res && res.images && res.images.secure_base_url) {
        dispatch(
          getApiConfiguration({
            backdrop: res.images.secure_base_url + "w1280",
            poster: res.images.secure_base_url + "w500",
            profile: res.images.secure_base_url + "w185",
          })
        );
      }
    } catch (e) {
      console.error("Error refreshing configuration:", e);
    }
  };

  const handleSaveTmdb = async (e) => {
    e.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) {
      setStatusMessage({ type: "error", text: "TMDB Token cannot be empty." });
      return;
    }
    localStorage.setItem("tmdb_token", cleanToken);
    await refreshConfig();
    setStatusMessage({
      type: "success",
      text: "TMDB Access Token saved successfully!",
    });
  };

  const handleClearTmdb = async () => {
    localStorage.removeItem("tmdb_token");
    setToken("");
    await refreshConfig();
    setStatusMessage({
      type: "info",
      text: "Custom TMDB token cleared. Reverted to default application token.",
    });
  };

  const handleSaveSimkl = async (e) => {
    e.preventDefault();
    const cleanId = simklClientId.trim();
    const cleanSecret = simklClientSecret.trim();
    if (!cleanId) {
      setSimklStatus({ type: "error", text: "SIMKL Client ID cannot be empty." });
      return;
    }
    localStorage.setItem("simkl_client_id", cleanId);
    if (cleanSecret) {
      localStorage.setItem("simkl_client_secret", cleanSecret);
    } else {
      localStorage.removeItem("simkl_client_secret");
    }

    setTestingSimkl(true);
    const testRes = await testSimklConnection(cleanId);
    setTestingSimkl(false);

    if (testRes.success) {
      setSimklStatus({ type: "success", text: testRes.message });
    } else {
      setSimklStatus({ type: "error", text: testRes.message });
    }
  };

  const handleClearSimkl = async () => {
    localStorage.removeItem("simkl_client_id");
    localStorage.removeItem("simkl_client_secret");
    localStorage.removeItem("simkl_access_token");
    setSimklClientId("");
    setSimklClientSecret("");
    setSimklStatus({ type: "info", text: "SIMKL credentials cleared." });
  };

  const handleSaveGroq = async (e) => {
    e.preventDefault();
    const cleanKey = groqKey.trim();
    saveGroqApiKey(cleanKey);
    setGroqStatus({ type: "success", text: cleanKey ? "Groq AI Stream Filter Key saved!" : "Groq AI Key cleared." });
  };

  const handleClearGroq = async () => {
    saveGroqApiKey("");
    setGroqKey("");
    setGroqStatus({ type: "success", text: "Groq AI Key cleared." });
  };

  const handleSavePremiumize = async (e) => {
    e.preventDefault();
    const cleanKey = premiumizeKey.trim();
    savePremiumizeKey(cleanKey);
    setPremiumizeStatus({ type: "success", text: "Premiumize API Key saved successfully!" });
  };

  const handleClearPremiumize = async () => {
    savePremiumizeKey("");
    setPremiumizeKey("");
    setPremiumizeStatus({ type: "success", text: "Premiumize API Key cleared." });
  };

  const handleSaveDispatcharr = async (e) => {
    e.preventDefault();
    const cleanUrl = dispatcharrUrl.trim();
    const cleanKey = dispatcharrApiKey.trim();
    localStorage.setItem("dispatcharr_url", cleanUrl);
    localStorage.setItem("dispatcharr_api_key", cleanKey);
    setDispatcharrStatus({ type: "success", text: "Dispatcharr Live TV configuration saved!" });
  };

  const handleClearDispatcharr = async () => {
    localStorage.removeItem("dispatcharr_url");
    localStorage.removeItem("dispatcharr_api_key");
    setDispatcharrUrl("");
    setDispatcharrApiKey("");
    setDispatcharrStatus({ type: "info", text: "Dispatcharr settings cleared." });
  };

  const handleToggleResolution = (resId) => {
    setSelectedResolutions((prev) =>
      prev.includes(resId) ? prev.filter((id) => id !== resId) : [...prev, resId]
    );
  };

  const handleSaveStreamFilters = async (e) => {
    e.preventDefault();
    localStorage.setItem("stream_resolutions", JSON.stringify(selectedResolutions));
    localStorage.setItem("stream_exclude_low_quality", JSON.stringify(excludeLowQuality));
    setFilterStatus({
      type: "success",
      text: "Stream resolution and CAM/HDTS quality exclusion preferences saved!",
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await fetchDataFromAPI("/configuration");
      if (res && res.images) {
        await refreshConfig();
        setStatusMessage({
          type: "success",
          text: "TMDB connection test successful! Key is valid.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: "Connection failed. Please check your TMDB API token.",
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: "Error testing connection. Invalid TMDB API token.",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="settingsPage">
      <TopNav />
      <ContentWrapper>
        <div className="settingsContainer">
          <div className="settingsHeader">
            <h1 className="title">
              <FiKey className="icon" /> BubbaFlix TV Settings
            </h1>
            <p className="subtitle">
              Configure your color theme, allowed stream resolutions, Dispatcharr Live TV, SIMKL history tracking, and API keys directly on your TV.
            </p>
          </div>

          {/* Color Theme Selector Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiSun style={{ marginRight: 8 }} /> Color Theme</h2>
            </div>
            <p className="description">
              Select your preferred color theme for BubbaFlix TV.
            </p>
                          
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="checkbox" 
                id="disableBg" 
                checked={disableBackgrounds} 
                onChange={handleToggleBackgrounds} 
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="disableBg" style={{ cursor: 'pointer', fontSize: '1.1rem', color: 'white' }}>Disable Background Art</label>
            </div>
            <div className="themeGrid">
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className={`themeCard ${activeTheme === theme.id ? "active" : ""}`}
                  onClick={() => handleSelectTheme(theme.id)}
                  tabIndex="0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectTheme(theme.id);
                    }
                  }}
                >
                  <div
                    className="themePreview"
                    style={{
                      background: theme.bg,
                      borderColor: activeTheme === theme.id ? theme.primary : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="previewHeader" style={{ background: theme.bg2 }}>
                      <div className="previewBadge" style={{ background: theme.gradient }} />
                    </div>
                    <div className="previewBody">
                      <div className="previewDot" style={{ background: theme.primary }} />
                      <div className="previewDot" style={{ background: theme.secondary }} />
                    </div>
                  </div>
                  <div className="themeInfo">
                    <span className="themeName">{theme.name}</span>
                    <span className="themeDesc">{theme.description}</span>
                  </div>
                  {activeTheme === theme.id && (
                    <div className="activeCheck">
                      <FiCheckCircle />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dispatcharr Live TV & EPG Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiTv style={{ marginRight: 8, color: "var(--pink)" }} /> Dispatcharr Live TV & EPG Settings</h2>
            </div>
            <p className="description">
              Connect to your local Dispatcharr instance to enable Live TV channel guides, EPG programming, and DVR recordings.
            </p>
            <form onSubmit={handleSaveDispatcharr} className="tokenForm">
              <div className="inputGroup">
                <label htmlFor="dispatcharrUrl">DISPATCHARR_SERVER_URL</label>
                <div className="inputWrapper">
                  <input
                    id="dispatcharrUrl"
                    type="text"
                    value={dispatcharrUrl}
                    onChange={(e) => setDispatcharrUrl(e.target.value)}
                    placeholder="e.g. http://192.168.1.100:9000"
                  />
                </div>
              </div>
              <div className="inputGroup" style={{ marginTop: 12 }}>
                <label htmlFor="dispatcharrApiKey">DISPATCHARR_API_KEY (Optional)</label>
                <div className="inputWrapper">
                  <input
                    id="dispatcharrApiKey"
                    type={showDispatcharrKey ? "text" : "password"}
                    value={dispatcharrApiKey}
                    onChange={(e) => setDispatcharrApiKey(e.target.value)}
                    placeholder="Enter your Dispatcharr API Key..."
                  />
                  <button
                    type="button"
                    className="toggleVisibility"
                    onClick={() => setShowDispatcharrKey(!showDispatcharrKey)}
                  >
                    {showDispatcharrKey ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              {dispatcharrStatus && (
                <div className={`statusBanner ${dispatcharrStatus.type}`}>
                  {dispatcharrStatus.type === "success" && <FiCheckCircle />}
                  {dispatcharrStatus.type === "info" && <FiInfo />}
                  <span>{dispatcharrStatus.text}</span>
                </div>
              )}
              <div className="buttonGroup" style={{ marginTop: 15 }}>
                <button type="submit" className="saveBtn">
                  <FiSave /> Save Dispatcharr Config
                </button>
                {dispatcharrUrl && (
                  <button type="button" className="clearBtn" onClick={handleClearDispatcharr}>
                    Clear Config
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Home Screen Category Manager */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiSliders style={{ marginRight: 8, color: "var(--pink)" }} /> Home Screen Category Manager</h2>
            </div>
            <p className="description">
              Toggle categories on/off and adjust display order for your TV home screen.
            </p>
            {homeSectionStatus && (
              <div className={`statusNotice ${homeSectionStatus.type}`} style={{ marginBottom: 15 }}>
                {homeSectionStatus.type === "success" ? <FiCheckCircle /> : <FiInfo />}
                <span>{homeSectionStatus.text}</span>
              </div>
            )}
            <div className="homeSectionsManager" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 15 }}>
              {homeSections.map((sec, idx) => (
                <div
                  key={sec.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(255, 255, 255, 0.04)",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleHomeSection(sec.id)}
                    style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 15, fontWeight: 500, color: "#ffffff", background: "transparent", border: "none", padding: 0 }}
                  >
                    <div style={{ width: 18, height: 18, border: "2px solid var(--pink)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: sec.enabled ? "var(--pink)" : "transparent" }}>
                      {sec.enabled && <FiCheck size={14} color="#fff" />}
                    </div>
                    <span style={{ color: "#ffffff" }}>{sec.title}</span>
                  </button>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveHomeSection(idx, -1)}
                      title="Move Up"
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "none",
                        color: "#fff",
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: idx === 0 ? "not-allowed" : "pointer",
                        opacity: idx === 0 ? 0.3 : 1,
                      }}
                    >
                      <FiChevronUp />
                    </button>
                    <button
                      type="button"
                      disabled={idx === homeSections.length - 1}
                      onClick={() => handleMoveHomeSection(idx, 1)}
                      title="Move Down"
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "none",
                        color: "#fff",
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: idx === homeSections.length - 1 ? "not-allowed" : "pointer",
                        opacity: idx === homeSections.length - 1 ? 0.3 : 1,
                      }}
                    >
                      <FiChevronDown />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="buttonGroup" style={{ marginTop: 20, display: "flex", gap: 12 }}>
              <button
                type="button"
                className="saveBtn"
                onClick={handleSaveHomeSections}
                style={{ background: "var(--pink)", borderColor: "var(--pink)", color: "#ffffff", display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
              >
                <FiSave /> Save Home Layout
              </button>
              <button
                type="button"
                className="clearBtn"
                onClick={handleResetHomeSections}
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, cursor: "pointer" }}
              >
                <FiRotateCcw /> Reset Defaults
              </button>
            </div>
          </div>

          {/* Stream Resolution & Quality Filters */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiSliders style={{ marginRight: 8 }} /> Stream Resolution & Quality Filters</h2>
            </div>
            <p className="description">
              Configure allowed resolutions and toggle low-quality release exclusions.
            </p>
            <form onSubmit={handleSaveStreamFilters} className="tokenForm">
              <div className="inputGroup">
                <label>ALLOWED_STREAM_RESOLUTIONS</label>
                <div className="resolutionGrid">
                  {ALL_RESOLUTIONS.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      className={`resOption ${selectedResolutions.includes(res.id) ? "selected" : ""}`}
                      onClick={() => handleToggleResolution(res.id)}
                      tabIndex="0"
                    >
                      <span className="checkbox">
                        {selectedResolutions.includes(res.id) ? "✓" : ""}
                      </span>
                      <span className="resLabel">{res.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="inputGroup" style={{ marginTop: 20 }}>
                <label>EXCLUDE_LOW_QUALITY_CAM_HDTS</label>
                <div
                  className={`qualityToggle ${excludeLowQuality ? "active" : ""}`}
                  onClick={() => setExcludeLowQuality(!excludeLowQuality)}
                  tabIndex="0"
                >
                  <span className="toggleSwitch" />
                  <span className="toggleLabel">
                    {excludeLowQuality
                      ? "Strictly Exclude CAM, HDCAM, Telesync, and HDTS Releases"
                      : "Allow CAM Releases"}
                  </span>
                </div>
              </div>
              {filterStatus && (
                <div className={`statusBanner ${filterStatus.type}`}>
                  {filterStatus.type === "success" && <FiCheckCircle />}
                  <span>{filterStatus.text}</span>
                </div>
              )}
              <div className="buttonGroup" style={{ marginTop: 20 }}>
                <button type="submit" className="saveBtn">
                  <FiSave /> Save Stream Preferences
                </button>
              </div>
            </form>
          </div>

          {/* SIMKL Watch Tracker Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiCheckCircle style={{ marginRight: 8 }} /> SIMKL Watch Status Tracker</h2>
            </div>
            <p className="description">
              Sync watched playback history automatically with your SIMKL account.
            </p>
            <form onSubmit={handleSaveSimkl} className="tokenForm">
              <div className="inputGroup">
                <label htmlFor="simklClientId">SIMKL_CLIENT_ID</label>
                <div className="inputWrapper">
                  <input
                    id="simklClientId"
                    type="text"
                    value={simklClientId}
                    onChange={(e) => setSimklClientId(e.target.value)}
                    placeholder="Enter your SIMKL API Client ID..."
                  />
                </div>
              </div>
              <div className="inputGroup" style={{ marginTop: 12 }}>
                <label htmlFor="simklClientSecret">SIMKL_CLIENT_SECRET (Optional)</label>
                <div className="inputWrapper">
                  <input
                    id="simklClientSecret"
                    type={showSimklSecret ? "text" : "password"}
                    value={simklClientSecret}
                    onChange={(e) => setSimklClientSecret(e.target.value)}
                    placeholder="Enter your SIMKL API Client Secret..."
                  />
                  <button
                    type="button"
                    className="toggleVisibility"
                    onClick={() => setShowSimklSecret(!showSimklSecret)}
                  >
                    {showSimklSecret ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              {simklStatus && (
                <div className={`statusBanner ${simklStatus.type}`}>
                  {simklStatus.type === "success" && <FiCheckCircle />}
                  {simklStatus.type === "error" && <FiXCircle />}
                  <span>{simklStatus.text}</span>
                </div>
              )}
              <div className="buttonGroup" style={{ marginTop: 15 }}>
                <button type="submit" className="saveBtn" disabled={testingSimkl}>
                  <FiSave /> {testingSimkl ? "Verifying..." : "Save SIMKL Config"}
                </button>
                {simklClientId && (
                  <button type="button" className="clearBtn" onClick={handleClearSimkl}>
                    Clear Credentials
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Groq AI Stream Filter Key Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiCpu style={{ marginRight: 8 }} /> Groq AI Stream Filter Key</h2>
            </div>
            <p className="description">
              Classify stream titles using fast Llama 3 AI inference to filter out low-quality/unwanted streams.
            </p>
            <form onSubmit={handleSaveGroq} className="tokenForm">
              <div className="inputGroup">
                <label htmlFor="groqKey">GROQ_API_KEY</label>
                <div className="inputWrapper">
                  <input
                    id="groqKey"
                    type={showGroqKey ? "text" : "password"}
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                  />
                  <button
                    type="button"
                    className="toggleVisibility"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                  >
                    {showGroqKey ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              {groqStatus && (
                <div className={`statusBanner ${groqStatus.type}`}>
                  {groqStatus.type === "success" && <FiCheckCircle />}
                  <span>{groqStatus.text}</span>
                </div>
              )}
              <div className="buttonGroup" style={{ marginTop: 15 }}>
                <button type="submit" className="saveBtn">
                  <FiSave /> Save Groq AI Key
                </button>
                {groqKey && (
                  <button type="button" className="clearBtn" onClick={handleClearGroq}>
                    Clear Key
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Premiumize.me API Cloud Stream Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiCloudLightning style={{ marginRight: 8 }} /> Premiumize.me Cloud Key</h2>
            </div>
            <p className="description">
              Resolves direct high-speed HTTP CDN video streams for instant playback across all devices.
            </p>
            <form onSubmit={handleSavePremiumize} className="tokenForm">
              <div className="inputGroup">
                <label htmlFor="premiumizeKey">PREMIUMIZE_API_KEY</label>
                <div className="inputWrapper">
                  <input
                    id="premiumizeKey"
                    type={showPremiumizeKey ? "text" : "password"}
                    value={premiumizeKey}
                    onChange={(e) => setPremiumizeKey(e.target.value)}
                    placeholder="Enter your Premiumize API Key..."
                  />
                  <button
                    type="button"
                    className="toggleVisibility"
                    onClick={() => setShowPremiumizeKey(!showPremiumizeKey)}
                  >
                    {showPremiumizeKey ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              {premiumizeStatus && (
                <div className={`statusBanner ${premiumizeStatus.type}`}>
                  {premiumizeStatus.type === "success" && <FiCheckCircle />}
                  <span>{premiumizeStatus.text}</span>
                </div>
              )}
              <div className="buttonGroup" style={{ marginTop: 15 }}>
                <button type="submit" className="saveBtn">
                  <FiSave /> Save Premiumize Key
                </button>
                {premiumizeKey && (
                  <button type="button" className="clearBtn" onClick={handleClearPremiumize}>
                    Clear Key
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* TMDB API Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2>TMDB Read Access Token</h2>
            </div>
            <p className="description">
              Used to fetch live movies, TV shows, backdrop banners, and poster images.
            </p>
            <form onSubmit={handleSaveTmdb} className="tokenForm">
              <div className="inputGroup">
                <label htmlFor="tmdbToken">TMDB_READ_ACCESS_TOKEN</label>
                <div className="inputWrapper">
                  <input
                    id="tmdbToken"
                    type={showToken ? "text" : "password"}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiJ9..."
                  />
                  <button
                    type="button"
                    className="toggleVisibility"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              {statusMessage && (
                <div className={`statusBanner ${statusMessage.type}`}>
                  {statusMessage.type === "success" && <FiCheckCircle />}
                  {statusMessage.type === "error" && <FiXCircle />}
                  <span>{statusMessage.text}</span>
                </div>
              )}
              <div className="buttonGroup" style={{ marginTop: 15 }}>
                <button type="submit" className="saveBtn">
                  <FiSave /> Save TMDB Token
                </button>
                <button
                  type="button"
                  className="testBtn"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  <FiRefreshCw className={testing ? "spin" : ""} />
                  {testing ? "Testing..." : "Test Token Connection"}
                </button>
                {token && (
                  <button type="button" className="clearBtn" onClick={handleClearTmdb}>
                    Clear Token
                  </button>
                )}
              </div>
            </form>
          </div>

        </div>
      </ContentWrapper>
    </div>
  );
};

export default SettingsPage;
