export const THEMES = [
  {
    id: "dark-red",
    name: "Dark Red (Netflix Style)",
    description: "Deep black background with iconic red accents & gradients",
    primary: "#e50914",
    secondary: "#b81d24",
    bg: "#141414",
    bg2: "#080808",
    bg3: "#1f1f1f",
    gradient: "linear-gradient(98.37deg, #e50914 0.99%, #b81d24 100%)",
  },
  {
    id: "cyber-midnight",
    name: "Cyber Midnight (Default)",
    description: "Deep blue background with vibrant pink & orange gradients",
    primary: "#da2f68",
    secondary: "#f89e00",
    bg: "#04152d",
    bg2: "#041226",
    bg3: "#020c1b",
    gradient: "linear-gradient(98.37deg, #f89e00 0.99%, #da2f68 100%)",
  },
  {
    id: "neon-emerald",
    name: "Neon Emerald",
    description: "Dark matrix green with gold & emerald accents",
    primary: "#00e676",
    secondary: "#ffc107",
    bg: "#0b1a14",
    bg2: "#07120e",
    bg3: "#040a08",
    gradient: "linear-gradient(98.37deg, #00e676 0.99%, #ffc107 100%)",
  },
  {
    id: "electric-purple",
    name: "Electric Purple",
    description: "Cyberpunk deep purple with cyan highlights",
    primary: "#7c4dff",
    secondary: "#00e5ff",
    bg: "#120924",
    bg2: "#0d061a",
    bg3: "#07030f",
    gradient: "linear-gradient(98.37deg, #7c4dff 0.99%, #00e5ff 100%)",
  },
  {
    id: "slate-minimal",
    name: "Slate Minimal",
    description: "Modern slate dark background with sky blue accents",
    primary: "#38bdf8",
    secondary: "#0284c7",
    bg: "#0f172a",
    bg2: "#020617",
    bg3: "#1e293b",
    gradient: "linear-gradient(98.37deg, #0284c7 0.99%, #38bdf8 100%)",
  },
];

export const getSavedTheme = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("app_theme") || "dark-red";
  }
  return "dark-red";
};

export const applyTheme = (themeId) => {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const root = document.documentElement;

  root.style.setProperty("--black", theme.bg);
  root.style.setProperty("--black2", theme.bg2);
  root.style.setProperty("--black3", theme.bg3);
  root.style.setProperty("--pink", theme.primary);
  root.style.setProperty("--orange", theme.secondary);
  root.style.setProperty("--gradient", theme.gradient);

  document.body.style.backgroundColor = theme.bg;
  localStorage.setItem("app_theme", theme.id);
  return theme;
};

if (typeof window !== "undefined") {
  window.addEventListener("user-preferences-loaded", (e) => {
    if (e.detail && e.detail.theme) {
      applyTheme(e.detail.theme);
    }
  });
}
