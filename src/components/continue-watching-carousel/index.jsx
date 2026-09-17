/* eslint-disable react/prop-types */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiPlay, FiX } from "react-icons/fi";
import ContentWrapper from "../content-wrapper";
import Img from "../lazy-load";
import PosterFallback from "../../assets/no-poster.png";
import { saveLastClickedPoster } from "../../utils/focusManager";
import { getStreamUrl, clearWatchProgress } from "../../utils/watchProgress";
import "./index.scss";

const DEFAULT_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

const ContinueWatchingCarousel = ({ items: initialItems, title, onPlayResume }) => {
  const navigate = useNavigate();
  const { url } = useSelector((state) => state.home);
  const posterBase = url?.poster || DEFAULT_IMAGE_BASE;

  // Local state so removing items is instant without a page refresh
  const [items, setItems] = useState(initialItems || []);

  if (!items || items.length === 0) return null;

  const handleSelect = (item) => {
    const savedUrl = getStreamUrl(item.tmdbId, item.mediaType, item.seasonNum, item.episodeNum);
    if (onPlayResume && savedUrl) {
      onPlayResume(item);
      return;
    }
    const type = item.mediaType === "tv" ? "tv" : "movie";
    saveLastClickedPoster(item.tmdbId, type);
    navigate(`/${type}/${item.tmdbId}`);
  };

  const handleClearProgress = (e, item) => {
    e.stopPropagation();
    clearWatchProgress(item.tmdbId, item.mediaType, item.seasonNum, item.episodeNum);
    setItems((prev) => prev.filter((i) => i.key !== item.key));
  };

  return (
    <div className="carousel continueWatchingSection">
      <ContentWrapper>
        {title && <div className="carouselTitle">{title}</div>}
        <div className="continueCarouselItems">
          {items.map((item) => {
            const posterUrl = item.posterPath
              ? posterBase + item.posterPath
              : PosterFallback;

            const subtitle =
              item.mediaType === "tv" && item.seasonNum != null && item.episodeNum != null
                ? `S${item.seasonNum} E${item.episodeNum}`
                : null;

            const posterKey = `poster-${item.mediaType}-${item.tmdbId}`;

            return (
              <div
                key={item.key}
                id={posterKey}
                data-poster-id={posterKey}
                className="continueItem"
                tabIndex="0"
                role="button"
                onClick={() => handleSelect(item)}
                onKeyDown={(e) => {
                  const code = e.keyCode;
                  if (
                    e.key === "Enter" ||
                    e.key === " " ||
                    code === 13 ||
                    code === 23 ||
                    code === 66
                  ) {
                    e.preventDefault();
                    handleSelect(item);
                  }
                }}
              >
                <div className="continuePosterBlock">
                  <Img className="continuePosterImg" src={posterUrl} />
                  <div className="resumeOverlay">
                    <FiPlay className="resumeIcon" />
                    <span className="resumeLabel">Resume</span>
                  </div>
                  <button
                    className="clearProgressBtn"
                    title="Remove from Continue Watching"
                    tabIndex="0"
                    onClick={(e) => handleClearProgress(e, item)}
                    onKeyDown={(e) => {
                      const code = e.keyCode;
                      if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                        e.preventDefault();
                        handleClearProgress(e, item);
                      }
                    }}
                  >
                    <FiX />
                  </button>
                  <div className="continueProgressBar">
                    <div
                      className="continueProgressFill"
                      style={{ width: `${item.progressPercent || 0}%` }}
                    />
                  </div>
                </div>
                <div className="continueTextBlock">
                  <span className="continueTitle">{item.title}</span>
                  {subtitle && <span className="continueSubtitle">{subtitle}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </ContentWrapper>
    </div>
  );
};

export default ContinueWatchingCarousel;
