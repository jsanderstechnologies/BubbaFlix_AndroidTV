/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";
import { isFavorite, toggleFavorite } from "../../utils/favorites";
import "./index.scss";

const FavoriteStar = ({ item, tmdbId, mediaType, size = "md" }) => {
  const [favorited, setFavorited] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const targetId = tmdbId || item?.id;
  const targetType = mediaType || item?.media_type || item?.mediaType || (item?.name ? "tv" : "movie");

  useEffect(() => {
    if (targetId) {
      setFavorited(isFavorite(targetId, targetType));
    }

    const handleUpdate = () => {
      if (targetId) {
        setFavorited(isFavorite(targetId, targetType));
      }
    };

    window.addEventListener("bubbaflix_favorites_updated", handleUpdate);
    return () => {
      window.removeEventListener("bubbaflix_favorites_updated", handleUpdate);
    };
  }, [targetId, targetType]);

  const handleToggle = (e) => {
    if (e) e.stopPropagation();

    const targetItem = item || {
      id: targetId,
      media_type: targetType,
      mediaType: targetType,
    };

    const isNowAdded = toggleFavorite(targetItem);
    setFavorited(isNowAdded);

    const msg = isNowAdded ? "Added to Favorites" : "Removed from Favorites";
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 2000);
  };

  return (
    <div className="favoriteStarWrapper">
      <button
        className={`favoriteStarBtn ${favorited ? "active" : ""} size-${size}`}
        tabIndex="0"
        role="button"
        aria-label={favorited ? "Remove from Favorites" : "Add to Favorites"}
        onClick={handleToggle}
        onKeyDown={(e) => {
          const code = e.keyCode;
          if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
            e.preventDefault();
            handleToggle(e);
          }
        }}
      >
        {favorited ? <AiFillStar className="starIcon filled" /> : <AiOutlineStar className="starIcon outline" />}
        <span className="starLabel">{favorited ? "Favorited" : "Favorite"}</span>
      </button>

      {toastMessage && <div className="favoriteToast">{toastMessage}</div>}
    </div>
  );
};

export default FavoriteStar;
