// Smart TV & Streaming Device Detection and Screen Zoom Manager for BubbaFlix

export const isTvDevice = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  const isAndroidTv = /Android/i.test(ua) && (/TV/i.test(ua) || /GoogleTV/i.test(ua) || /SmartTV/i.test(ua) || /Nexus Player/i.test(ua));
  const isFireTv = /AFT/i.test(ua) || /FireTV/i.test(ua) || /Silk/i.test(ua);
  const isAppleTv = /AppleTV/i.test(ua) || /AppleTV/i.test(platform);
  const isWebOS = /Web0S/i.test(ua) || /WebOS/i.test(ua) || /hpwOS/i.test(ua);
  const isTizen = /Tizen/i.test(ua);
  const isGenericTv = /SmartTV/i.test(ua) || /TV/i.test(ua) || /HbbTV/i.test(ua) || /NetCast/i.test(ua);

  const manualTvMode = localStorage.getItem("tv_mode_enabled");
  if (manualTvMode !== null) {
    return JSON.parse(manualTvMode);
  }

  return isAndroidTv || isFireTv || isAppleTv || isWebOS || isTizen || isGenericTv;
};

// Reset any legacy zoom CSS properties on launch
if (typeof window !== "undefined") {
  localStorage.removeItem("tv_zoom_scale");
  if (document.documentElement) {
    document.documentElement.style.removeProperty("zoom");
    document.documentElement.style.removeProperty("--app-zoom");
  }
  if (document.body) {
    document.body.style.removeProperty("zoom");
  }
}
