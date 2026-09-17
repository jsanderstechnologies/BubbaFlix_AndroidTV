import { useState, useEffect } from "react";
import { FiTv, FiDownload, FiX, FiCheck } from "react-icons/fi";
import { getServerUrl } from "../../utils/serverSettings";
import versionData from "../../../version.json";
import "./index.scss";

const APK_URL = "https://raw.githubusercontent.com/jsanderstechnologies/BubbaFlix/master/BubbaFlixTV.apk";
const DOWNLOADER_CODE = "7862216";

const TvInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [versionName, setVersionName] = useState(versionData?.versionName || "1.0.3");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Fetch latest version.json dynamically
    const fetchVersion = async () => {
      try {
        const timestamp = Date.now();
        const serverUrl = getServerUrl() || "https://bubbaflix.sanders-technologies.net";
        const res = await fetch(`${serverUrl}/api/version?t=${timestamp}`);
        if (res.ok) {
          const data = await res.json();
          if (data.versionName) setVersionName(data.versionName);
        }
      } catch (err) {
        console.warn("[TvInstallPrompt] Unable to fetch live version.json:", err.message);
      }
    };
    fetchVersion();

    // Check if running inside native Android App (window.AndroidPlayer exists when in native APK)
    const isNativeApp = !!window.AndroidPlayer;

    // Detect if running on an Android TV / Smart TV / TV Browser
    const ua = navigator.userAgent || "";
    const isTvBrowser =
      !isNativeApp &&
      /Android/i.test(ua) &&
      (/TV/i.test(ua) ||
        /SmartTV/i.test(ua) ||
        /Large Screen/i.test(ua) ||
        /MediaShell/i.test(ua) ||
        /CrKey/i.test(ua) ||
        /Leanback/i.test(ua) ||
        window.innerWidth >= 960);

    const dismissed = sessionStorage.getItem("bubbaflix_tv_install_dismissed");

    if (isTvBrowser && !dismissed) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("bubbaflix_tv_install_dismissed", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="tvInstallOverlay">
      <div className="tvInstallCard">
        <button className="closeBtn" onClick={handleDismiss} tabIndex="0" title="Close Prompt">
          <FiX />
        </button>

        <div className="cardHeader">
          <div className="tvBadgeIcon">
            <FiTv />
          </div>
          <h2>Install BubbaFlix TV App</h2>
        </div>

        <p className="installMessage">
          We noticed you're watching in an Android TV browser! For the ultimate remote control experience, 4K HDR playback, and automatic volume normalization, install our native TV app.
        </p>

        <div className="downloaderCodeBox">
          <span className="codeLabel">Downloader App Quick Code:</span>
          <span className="codeNum">{DOWNLOADER_CODE}</span>
        </div>

        <div className="actionButtons">
          <a
            href={APK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="downloadApkBtn"
            tabIndex="0"
          >
            <FiDownload /> Download BubbaFlixTV.apk (v{versionName})
          </a>
          <button className="continueBrowserBtn" onClick={handleDismiss} tabIndex="0">
            Continue in Browser
          </button>
        </div>
      </div>
    </div>
  );
};

export default TvInstallPrompt;
