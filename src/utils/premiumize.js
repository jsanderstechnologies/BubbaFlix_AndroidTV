import axios from "axios";
import { fetchServerSettings } from "./serverSettings";

const premAxios = axios.create();

export const getPremiumizeKey = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("premiumize_api_key");
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  }
  return "";
};

export const savePremiumizeKey = (key) => {
  if (typeof window === "undefined") return;
  if (!key || key.trim().length === 0) {
    localStorage.removeItem("premiumize_api_key");
  } else {
    localStorage.setItem("premiumize_api_key", key.trim());
  }
};

/**
 * Resolves a magnet link into a direct high-speed HTTP/HTTPS CDN video stream via Premiumize.me API
 * Automatically adds the magnet transfer to the user's Premiumize cloud storage (7-day retention)
 */
export const resolveMagnetWithPremiumize = async (magnetUrl, customApiKey = null, seasonNum = null, episodeNum = null) => {
  try {
    let apiKey = customApiKey || getPremiumizeKey();

    if (!apiKey) {
      // Fallback check server backend settings
      const serverSettings = await fetchServerSettings();
      apiKey = serverSettings?.premiumizeKey || "";
    }

    if (!apiKey) {
      return {
        success: false,
        message: "No Premiumize API Key configured. Please save your Premiumize API Key in Settings.",
      };
    }

    console.log("[Premiumize API] Submitting magnet link for 7-day cloud transfer creation...");

    // 1. Create transfer on Premiumize using x-www-form-urlencoded params
    const createParams = new URLSearchParams();
    createParams.append("src", magnetUrl);
    createParams.append("apikey", apiKey);

    const createRes = await premAxios.post("https://www.premiumize.me/api/transfer/create", createParams, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 12000,
    });

    if (createRes.data && createRes.data.status === "success") {
      const transferId = createRes.data.id;
      const transferName = createRes.data.name || "Media File";
      console.log(`[Premiumize API] Transfer successfully created in Cloud Transfers: ID=${transferId}, Name=${transferName}`);

      // 2. Query transfer status / file list to get direct CDN stream link
      let match = null;
      let attempts = 0;
      
      while (!match && attempts < 10) {
        await new Promise((r) => setTimeout(r, 1500));
        
        const listParams = new URLSearchParams();
        listParams.append("apikey", apiKey);

        const listRes = await premAxios.post("https://www.premiumize.me/api/transfer/list", listParams, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 10000,
        });

        if (listRes.data && listRes.data.status === "success" && Array.isArray(listRes.data.transfers)) {
          const found = listRes.data.transfers.find((t) => t.id === transferId || t.name === transferName);
          if (found && (found.file_id || found.folder_id || found.status === "finished")) {
            match = found;
          }
        }
        
        attempts++;
      }

      if (match) {
          const targetId = match.file_id || match.folder_id;
          if (targetId) {
            const itemParams = new URLSearchParams();
            itemParams.append("id", targetId);
            itemParams.append("apikey", apiKey);

            if (match.file_id) {
              const fileRes = await premAxios.post("https://www.premiumize.me/api/item/details", itemParams, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                timeout: 10000,
              });
              if (fileRes.data && fileRes.data.link) {
                console.log(`[Premiumize API] Direct Stream CDN URL Resolved: ${fileRes.data.link}`);
                return {
                  success: true,
                  streamUrl: fileRes.data.link,
                  title: fileRes.data.name || transferName,
                };
              }
            } else if (match.folder_id) {
              const folderRes = await premAxios.post("https://www.premiumize.me/api/folder/list", itemParams, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                timeout: 10000,
              });
              if (folderRes.data && Array.isArray(folderRes.data.content)) {
                const videoFiles = folderRes.data.content
                  .filter((item) => item.type === "file" && item.link)
                  .sort((a, b) => (b.size || 0) - (a.size || 0));

                let bestFile = videoFiles.length > 0 ? videoFiles[0] : null;

                if (seasonNum != null && episodeNum != null && videoFiles.length > 0) {
                  const s = String(seasonNum).padStart(2, '0');
                  const e = String(episodeNum).padStart(2, '0');
                  const rx1 = new RegExp(`s${s}e${e}`, 'i');
                  const rx2 = new RegExp(`${seasonNum}x${episodeNum}`, 'i');
                  const rx3 = new RegExp(`s0?${seasonNum}e0?${episodeNum}`, 'i');

                  const epFile = videoFiles.find(f => {
                     const name = f.name || "";
                     return rx1.test(name) || rx2.test(name) || rx3.test(name);
                  });
                  if (epFile) bestFile = epFile;
                }

                if (bestFile) {
                  console.log(`[Premiumize API] Folder Video File Resolved: ${bestFile.name} -> ${bestFile.link}`);
                  return {
                    success: true,
                    streamUrl: bestFile.stream_link || bestFile.link,
                    title: bestFile.name || transferName,
                  };
                }
              }
            }
          }
        }

    } else if (createRes.data && createRes.data.message) {
      console.warn("[Premiumize API Notice]:", createRes.data.message);
      return {
        success: false,
        message: createRes.data.message,
      };
    }
  } catch (err) {
    console.warn("[Premiumize API Error]:", err.message);
    return {
      success: false,
      message: err.response?.data?.message || err.message || "Failed to resolve magnet with Premiumize API.",
    };
  }

  return {
    success: false,
    message: "Magnet added to Premiumize Cloud. Please allow a few moments for download or select another stream.",
  };
};

export const checkPremiumizeCache = async (magnets) => {
  let apiKey = getPremiumizeKey();
  if (!apiKey) {
    const serverSettings = await fetchServerSettings();
    apiKey = serverSettings?.premiumizeKey || "";
  }
  if (!apiKey || !magnets || magnets.length === 0) return [];

  try {
    const params = new URLSearchParams();
    magnets.forEach(m => params.append("items[]", m));

    const res = await axios.post(`https://www.premiumize.me/api/cache/check?apikey=${apiKey}`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    if (res.data?.status === "success") {
      return res.data.response || [];
    }
  } catch (err) {
    console.error("[Premiumize API] Cache check failed:", err);
  }
  return magnets.map(() => false);
};

export const getPremiumizeTransfers = async () => {
  let apiKey = getPremiumizeKey();
  if (!apiKey) {
    const serverSettings = await fetchServerSettings();
    apiKey = serverSettings?.premiumizeKey || "";
  }
  if (!apiKey) return [];

  try {
    const res = await axios.get(`https://www.premiumize.me/api/transfer/list?apikey=${apiKey}`);
    if (res.data?.status === "success") {
      return res.data.transfers || [];
    }
  } catch (err) {
    console.error("[Premiumize API] Transfer list failed:", err);
  }
  return [];
};
