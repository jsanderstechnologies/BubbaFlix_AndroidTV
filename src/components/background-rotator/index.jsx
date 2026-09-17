import { useState, useEffect, useContext } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import "./index.scss";

const WALLPAPERS = [
  "/wallpaper_tv_shows.jpg",
  "/horror_background.jpg",
  "/wallpaper_mix_movies.jpg",
  "/wallpaper_film_posters.jpg",
];

const BackgroundRotator = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [activeIdx, setActiveIdx] = useState(0);

  const disableBg = (localStorage.getItem("disable_backgrounds") !== null ? JSON.parse(localStorage.getItem("disable_backgrounds")) : null) ?? user?.preferences?.disableBackgrounds ?? false;

  // Set dedicated background on route change (e.g. TV Shows page) or rotate to next
  useEffect(() => {
    if (location.pathname === "/explore/tv") {
      // Dedicated TV Shows Collage Wallpaper
      setActiveIdx(0);
    } else if (location.pathname === "/explore/movie") {
      setActiveIdx(2);
    } else {
      setActiveIdx((prevIdx) => (prevIdx + 1) % WALLPAPERS.length);
    }
  }, [location.pathname]);

  // Timed auto-rotation every 45 seconds while viewing general pages
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx((prevIdx) => (prevIdx + 1) % WALLPAPERS.length);
    }, 45000);
    return () => clearInterval(timer);
  }, []);

  if (disableBg) {
    return null;
  }

  return (
    <div className="backgroundRotatorStage">
      {WALLPAPERS.map((url, idx) => (
        <div
          key={url}
          className={`bgLayer ${idx === activeIdx ? "active" : ""}`}
          style={{ backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.42)), url("${url}")` }}
        />
      ))}
    </div>
  );
};

export default BackgroundRotator;
