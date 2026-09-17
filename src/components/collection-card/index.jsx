import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiLayers } from "react-icons/fi";
import { saveLastClickedPoster } from "../../utils/focusManager";
import Img from "../lazy-load";
import PosterFallback from "../../assets/no-poster.png";
import "./index.scss";

const DEFAULT_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const CollectionCard = ({ data }) => {
  const { url } = useSelector((state) => state.home);
  const navigate = useNavigate();

  if (!data) return null;

  const posterBase = url?.poster || DEFAULT_IMAGE_BASE;
  const posterUrl = data.poster_path
    ? posterBase + data.poster_path
    : PosterFallback;

  const posterKey = `poster-collection-${data.id}`;

  const handleSelect = () => {
    saveLastClickedPoster(data.id, "collection");
    navigate(`/collection/${data.id}`);
  };

  const partsCount = data.parts?.length || data.parts_count || null;

  return (
    <div
      id={posterKey}
      data-poster-id={posterKey}
      className="collectionCard"
      tabIndex={0}
      role="button"
      onClick={handleSelect}
      onKeyDown={(e) => {
        const code = e.keyCode;
        if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
          e.preventDefault();
          handleSelect();
        }
      }}
    >
      <div className="posterBlock">
        <Img className="posterImg" src={posterUrl} />
        <div className="collectionBadge">
          <FiLayers className="badgeIcon" />
          <span>{partsCount ? `${partsCount} Movies` : "Collection"}</span>
        </div>
      </div>
      <div className="textBlock">
        <span className="title">{data.name || data.title}</span>
        <span className="subtitle">Movie Franchise</span>
      </div>
    </div>
  );
};

export default CollectionCard;
