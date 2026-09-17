import { useEffect, useState } from "react";
import { fetchDataFromAPI } from "./utils/api";
import { useDispatch, useSelector } from "react-redux";
import { getApiConfiguration } from "./store/homeSlice";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/home-page";
import DetailsPage from "./pages/details-page";
import SearchResult from "./pages/search-result";
import ExplorePage from "./pages/explore-page";
import FavoritesPage from "./pages/favorites-page";
import SettingsPage from "./pages/settings-page";
import UsagePage from "./pages/usage-page";
import CollectionPage from "./pages/collection-page";
import PersonPage from "./pages/person-page";
import Page404 from "./pages/404-page";
import Footer from "./components/footer";
import SplashScreen from "./components/splash-screen";

import { getSavedTheme, applyTheme } from "./utils/theme";
import { initDpadNavigation } from "./utils/dpadNavigation";
import { fetchUserSimklHistory } from "./utils/simkl";
import { fetchServerSettings } from "./utils/serverSettings";

import AboutPage from "./pages/about-page";
import TvInstallPrompt from "./components/tv-install-prompt";
import BackgroundRotator from "./components/background-rotator";
import GlobalSearchListener from "./components/global-search-listener";

import AuthPage from "./pages/auth-page";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { useContext } from "react";

const AppContent = () => {
  const dispatch = useDispatch();
  const { url } = useSelector((state) => state.home);
  const { user, loading, setupRequired, updatePreferences } = useContext(AuthContext);
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem("bubbaflix_splash_shown");
  });

  useEffect(() => {
    const cleanupDpad = initDpadNavigation();

    const handleGlobalKeyDown = (e) => {
      // Prevent Home/End from scrolling the view out of sync with D-pad focus (PageUp/Down handled by dpad engine)
      if (
        e.key === "Home" || e.keyCode === 36 || 
        e.key === "End" || e.keyCode === 35
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true, passive: false });

    return () => {
      if (cleanupDpad) cleanupDpad();
      window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!user) return; // Only fetch data if logged in
    const currentTheme = getSavedTheme();
    applyTheme(currentTheme);

    fetchApiConfig();
    fetchUserSimklHistory();
    fetchServerSettings();

    const syncFavorites = () => {
      try {
        const rawFavs = localStorage.getItem("bubbaflix_favorites");
        const rawFavCols = localStorage.getItem("bubbaflix_favorite_collections");
        const rawFavChans = localStorage.getItem("bubbaflix_favorite_channels");
        updatePreferences({
          favorites: rawFavs ? JSON.parse(rawFavs) : [],
          favoriteCollections: rawFavCols ? JSON.parse(rawFavCols) : [],
          favoriteChannels: rawFavChans ? JSON.parse(rawFavChans) : []
        });
      } catch (e) {
        console.error("Failed to sync favorites to backend", e);
      }
    };

    window.addEventListener("bubbaflix_favorites_updated", syncFavorites);
    window.addEventListener("favorite-channels-updated", syncFavorites);

    return () => {
      window.removeEventListener("bubbaflix_favorites_updated", syncFavorites);
      window.removeEventListener("favorite-channels-updated", syncFavorites);
    };
  }, [user?.id]);

  const handleSplashComplete = () => {
    sessionStorage.setItem("bubbaflix_splash_shown", "true");
    setShowSplash(false);
  };

  const fetchApiConfig = () => {
    fetchDataFromAPI("/configuration").then((res) => {
      const url = {
        backdrop: res.images.secure_base_url + "original",
        poster: res.images.secure_base_url + "original",
        profile: res.images.secure_base_url + "original",
      };
      dispatch(getApiConfiguration(url));
    });
  };

  if (loading) return null; // Or a simple spinner
  
  if (setupRequired || !user) {
    return <AuthPage />;
  }

  return (
    <BrowserRouter>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <TvInstallPrompt />
      <BackgroundRotator />
      {!showSplash && (
        <div style={{ position: "relative", zIndex: 1, opacity: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/usage" element={<UsagePage />} />
            <Route path="/collection/:id" element={<CollectionPage />} />
            <Route path="/person/:id" element={<PersonPage />} />
            <Route path="/:mediaType/:id" element={<DetailsPage />} />
            <Route path="/search" element={<SearchResult />} />
            <Route path="/search/:query" element={<SearchResult />} />
            <Route path="/explore/:mediaType" element={<ExplorePage />} />
            <Route path="*" element={<Page404 />} />
          </Routes>
          <Footer />
        </div>
      )}
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
