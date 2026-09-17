import React, { useState, useEffect } from "react";
import {
  FiInfo,
  FiGithub,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
  FiTv,
  FiCpu,
  FiExternalLink,
  FiServer,
  FiAlertCircle
} from "react-icons/fi";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import { getServerUrl, testBackendServerHealth } from "../../utils/serverSettings";
import versionData from "../../../version.json";
import "./index.scss";

const APP_VERSION = `v${versionData?.versionName || "1.0.5"}`;
const CURRENT_VERSION_CODE = versionData?.versionCode || 6;
const DOWNLOADER_CODE = "7862216";
const GITHUB_REPO_URL = "https://github.com/jsanderstechnologies/BubbaFlix";

const AboutPage = () => {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);
  const [isTvApp, setIsTvApp] = useState(false);
  const [gpuInfo, setGpuInfo] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || "";
      const isTv =
        ua.includes("BubbaFlixTV") ||
        ua.includes("AndroidTV") ||
        ua.includes("SmartTV") ||
        ua.includes("GoogleTV") ||
        ua.includes("CrKey") ||
        ua.includes("AFT") ||
        window.Android !== undefined ||
        window.location.protocol === "file:";
      setIsTvApp(isTv);
    }

    const fetchGpuInfo = async () => {
      try {
        const res = await testBackendServerHealth();
        if (res && res.gpu) {
          setGpuInfo(res.gpu);
        }
      } catch (e) {
        // Continue with default placeholder
      }
    };
    fetchGpuInfo();
  }, []);

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateResult(null);

    const timestamp = Date.now();
    const githubUrl = `https://raw.githubusercontent.com/jsanderstechnologies/BubbaFlix/master/version.json?t=${timestamp}`;
    const backendProxyUrl = `${getServerUrl()}/api/version?t=${timestamp}`;

    let remoteData = null;

    // Strategy 1: Direct GitHub CDN fetch
    try {
      const res = await fetch(githubUrl, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      if (res.ok) {
        remoteData = await res.json();
      }
    } catch (err) {
      // Continue to Strategy 2
    }

    // Strategy 2: Backend proxy fetch if direct CDN failed or blocked by TV WebView
    if (!remoteData) {
      try {
        const res = await fetch(backendProxyUrl, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        if (res.ok) {
          remoteData = await res.json();
        }
      } catch (err) {
        // Both failed
      }
    }

    if (remoteData) {
      const remoteVersionCode = remoteData.versionCode || 6;
      const currentVersionCode = CURRENT_VERSION_CODE;

      if (remoteVersionCode > currentVersionCode) {
        setUpdateResult({
          hasUpdate: true,
          remoteVersion: remoteData.versionName || "1.0.5",
          apkUrl: remoteData.apkUrl || `${GITHUB_REPO_URL}/raw/master/BubbaFlixTV.apk`,
          releaseNotes: remoteData.releaseNotes || "New features and performance improvements available."
        });
      } else {
        setUpdateResult({
          hasUpdate: false,
          message: `You are running the latest version of BubbaFlix TV (${APP_VERSION})!`
        });
      }
    } else {
      setUpdateResult({
        hasUpdate: false,
        error: "Unable to check for updates right now. Ensure your device is connected to the internet."
      });
    }

    setCheckingUpdate(false);
  };

  return (
    <div className="aboutPage">
      <TopNav />
      <ContentWrapper>
        <div className="aboutContainer">
          <div className="appHeaderCard">
            <div className="aboutLogoWrapper">
              <img src="/tv_banner.png" alt="BubbaFlix TV" className="aboutLogoImage" />
            </div>
            <span className="appBadge">{APP_VERSION} ({isTvApp ? "Android TV Client" : "Self-Hosted Web Instance"})</span>
            <p className="appTagline">
              The ultimate high-performance media streaming client for Movies, TV Series, and Live TV.
            </p>
          </div>

          <div className="aboutGrid">
            {/* Version & Update Card */}
            <div className="infoCard">
              <div className="cardHeader">
                <FiRefreshCw className="cardIcon" />
                <h3>App Version & Updates</h3>
              </div>
              <div className="cardBody">
                <div className="detailRow">
                  <span className="label">Installed Version:</span>
                  <span className="value highlight">{APP_VERSION}</span>
                </div>
                <div className="detailRow">
                  <span className="label">Downloader App Code:</span>
                  <span className="value code">{DOWNLOADER_CODE}</span>
                </div>

                <div className="updateActionArea">
                  {isTvApp ? (
                    <button
                      className="checkUpdateBtn"
                      onClick={handleCheckForUpdates}
                      disabled={checkingUpdate}
                      tabIndex="0"
                    >
                      {checkingUpdate ? (
                        <><FiRefreshCw className="spinIcon" /> Checking GitHub...</>
                      ) : (
                        <><FiRefreshCw /> Check for Updates</>
                      )}
                    </button>
                  ) : (
                    <div className="webInstanceNotice">
                      <FiServer className="noticeIcon" />
                      <div>
                        <strong>Self-Hosted Docker Web Client</strong>
                        <p>
                          Web instances are managed via server containers. To update your web client, pull the latest image via Portainer, Docker Compose, or Unraid.
                        </p>
                      </div>
                    </div>
                  )}

                  {updateResult && (
                    <div className={`updateStatusBox ${updateResult.hasUpdate ? "hasUpdate" : "latest"}`}>
                      {updateResult.hasUpdate ? (
                        <div>
                          <div className="statusTitle">🚀 New Update Available ({updateResult.remoteVersion})</div>
                          <p>{updateResult.releaseNotes}</p>
                          <a
                            href={updateResult.apkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="downloadApkBtn"
                            tabIndex="0"
                          >
                            <FiDownload /> Download BubbaFlixTV.apk
                          </a>
                        </div>
                      ) : updateResult.error ? (
                        <div className="statusError">
                          <FiAlertCircle /> {updateResult.error}
                        </div>
                      ) : (
                        <div className="statusLatest">
                          <FiCheckCircle className="checkIcon" /> {updateResult.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* GitHub & Open Source Info */}
            <div className="infoCard">
              <div className="cardHeader">
                <FiGithub className="cardIcon" />
                <h3>GitHub Repository & Source</h3>
              </div>
              <div className="cardBody">
                <p className="description">
                  BubbaFlix is open-source. Inspect code, contribute features, report issues, or download the latest release builds directly on GitHub.
                </p>

                <div className="linkGroup">
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="githubRepoLink"
                    tabIndex="0"
                  >
                    <FiGithub /> GitHub Repository <FiExternalLink />
                  </a>
                </div>
              </div>
            </div>

            {/* Tech Stack & Specs */}
            <div className="infoCard fullWidth">
              <div className="cardHeader">
                <FiCpu className="cardIcon" />
                <h3>Client & Server Specifications</h3>
              </div>
              <div className="cardBody specGrid">
                <div className="specItem highlightGpu">
                  <span className="specLabel">Transcoder Hardware GPU</span>
                  <span className="specValue gpuValue">
                    {gpuInfo ? gpuInfo.type : "Auto-Detecting GPU Acceleration..."}
                  </span>
                </div>
                <div className="specItem">
                  <span className="specLabel">Universal Native Player</span>
                  <span className="specValue">Android ExoPlayer + LoudnessEnhancer (v1.0.2+)</span>
                </div>
                <div className="specItem">
                  <span className="specLabel">Audio Normalization</span>
                  <span className="specValue">Active (+1.5 dB Loudness DSP)</span>
                </div>

                <div className="specItem">
                  <span className="specLabel">OTA Updater</span>
                  <span className="specValue">Dual-Channel GitHub CDN + Server Proxy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContentWrapper>
    </div>
  );
};

export default AboutPage;
