/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { isSimklWatched, toggleSimklWatched } from "../../utils/simkl";
import { FiCheckCircle, FiCircle } from "react-icons/fi";
import "./index.scss";

const WatchCheckmark = ({
  tmdbId,
  title,
  mediaType = "movie",
  seasonNum,
  episodeNum,
  label = "",
  size = "md",
  onToggle,
}) => {
  const [watched, setWatched] = useState(false);
  const [toggling, setToggling] = useState(false);

  const checkStatus = () => {
    const isW = isSimklWatched({ tmdbId, mediaType, seasonNum, episodeNum });
    setWatched(isW);
  };

  useEffect(() => {
    checkStatus();

    const handleUpdate = () => checkStatus();
    window.addEventListener("simkl-watch-updated", handleUpdate);
    return () => window.removeEventListener("simkl-watch-updated", handleUpdate);
  }, [tmdbId, mediaType, seasonNum, episodeNum]);

  const handleToggle = async (e) => {
    if (e) e.stopPropagation();
    setToggling(true);
    const newStatus = await toggleSimklWatched({
      tmdbId,
      title,
      mediaType,
      seasonNum,
      episodeNum,
    });
    setWatched(newStatus);
    setToggling(false);
    if (typeof onToggle === "function") {
      onToggle(newStatus);
    }
  };

  return (
    <button
      type="button"
      className={`watchCheckmark ${watched ? "watched" : "unwatched"} size-${size} ${toggling ? "toggling" : ""}`}
      onClick={handleToggle}
      tabIndex="0"
      title={watched ? "Mark as Unwatched" : "Mark as Watched"}
    >
      {watched ? (
        <FiCheckCircle className="checkIcon filled" />
      ) : (
        <FiCircle className="checkIcon outline" />
      )}
      {label && <span className="label">{label || (watched ? "Watched" : "Unwatched")}</span>}
    </button>
  );
};

export default WatchCheckmark;
