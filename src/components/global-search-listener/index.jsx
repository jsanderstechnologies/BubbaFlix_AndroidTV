import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const GlobalSearchListener = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Handle voice search callback from Android wrapper
        window.onVoiceSearchResult = (spokenQuery) => {
            if (spokenQuery && spokenQuery.trim()) {
                const clean = spokenQuery.trim();
                navigate(/search/);
            }
        };

        // Handle physical hardware Search button (keyCode 84 on Android TV / Fire TV)
        const handleKeyDown = (e) => {
            if (e.keyCode === 84 || e.key === "BrowserSearch" || e.key === "Search" || e.key === "AudioVolumeMute" && false) {
                // Ignore if they are already typing in an input
                if (document.activeElement && document.activeElement.tagName === "INPUT") return;
                e.preventDefault();
                navigate('/search');
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.onVoiceSearchResult = null;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [navigate]);

    return null;
};

export default GlobalSearchListener;
