import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiArrowLeft, FiLayers, FiFilm, FiCalendar, FiClock } from "react-icons/fi";
import { AiFillStar, AiOutlineStar } from "react-icons/ai";

import { fetchDataFromAPI } from "../../utils/api";
import { isFavoriteCollection, toggleFavoriteCollection } from "../../utils/favorites";
import { restoreLastFocusedPoster } from "../../utils/focusManager";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import MovieCard from "../../components/movie-card";
import Spinner from "../../components/spinner";
import Img from "../../components/lazy-load";
import PosterFallback from "../../assets/no-poster.png";
import "./index.scss";

const CollectionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { url } = useSelector((state) => state.home);

  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchDataFromAPI(`/collection/${id}`)
      .then((res) => {
        setCollection(res);
        setIsFav(isFavoriteCollection(id));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load TMDB collection:", err);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    restoreLastFocusedPoster();
  }, [collection]);

  const handleToggleFavorite = () => {
    if (collection) {
      const nextFavState = toggleFavoriteCollection(collection);
      setIsFav(nextFavState);
    }
  };

  const backdropBase = url?.backdrop || "https://image.tmdb.org/t/p/w1280";
  const posterBase = url?.poster || "https://image.tmdb.org/t/p/w500";

  const backdropUrl = collection?.backdrop_path
    ? backdropBase + collection.backdrop_path
    : null;

  const posterUrl = collection?.poster_path
    ? posterBase + collection.poster_path
    : PosterFallback;

  const parts = Array.isArray(collection?.parts)
    ? [...collection.parts].sort((a, b) => new Date(a.release_date || 0) - new Date(b.release_date || 0))
    : [];

  // Remote & Keyboard D-pad Back Key Handler
  useEffect(() => {
    document.body.classList.add("collectionDetailsActive");
    const handleCollectionKeyDown = (e) => {
      const key = e.key;
      const code = e.keyCode;
      if (key === "Escape" || key === "Back" || code === 27 || code === 4 || code === 10009 || code === 461) {
        e.preventDefault();
        e.stopPropagation();
        navigate(-1);
      }
    };
    window.addEventListener("keydown", handleCollectionKeyDown, true);
    return () => {
      document.body.classList.remove("collectionDetailsActive");
      window.removeEventListener("keydown", handleCollectionKeyDown, true);
    };
  }, [navigate]);

  return (
    <div className="collectionDetailsPage">
      {/* Touch & D-pad Upper Left Back Arrow Button rendered first for DOM focus hierarchy */}
      <button
        className="detailsPageBackBtn"
        onClick={() => navigate(-1)}
        tabIndex={0}
        aria-label="Go Back"
        title="Go Back"
      >
        <FiArrowLeft />
      </button>

      <TopNav />

      {loading ? (
        <div className="loadingSpinnerWrapper">
          <Spinner initial />
        </div>
      ) : collection ? (
        <>
          {/* Backdrop Banner Header */}
          <div className="backdropBanner">
            {backdropUrl && <Img className="backdropImg" src={backdropUrl} />}
            <div className="bannerOverlay"></div>
          </div>

          <ContentWrapper>
            <div className="collectionHeader">
              <div className="posterBlock">
                <Img className="posterImg" src={posterUrl} />
              </div>
              <div className="infoBlock">
                <div className="tagBadge">
                  <FiLayers className="icon" /> TMDB Franchise Collection
                </div>
                <h1 className="title">{collection.name}</h1>
                <p className="overview">{collection.overview || "Explore all movies in the " + collection.name + " franchise."}</p>

                <div className="metaRow">
                  <span className="metaItem">
                    <FiFilm /> {parts.length} Movies
                  </span>
                  {parts[0]?.release_date && (
                    <span className="metaItem">
                      <FiCalendar /> {parts[0].release_date.substring(0, 4)} - {parts[parts.length - 1]?.release_date?.substring(0, 4) || "Present"}
                    </span>
                  )}
                </div>

                <div className="actionRow">
                  <button
                    className={`favCollectionBtn ${isFav ? "active" : ""}`}
                    onClick={handleToggleFavorite}
                    tabIndex={0}
                  >
                    {isFav ? <AiFillStar className="starIcon active" /> : <AiOutlineStar className="starIcon" />}
                    <span>{isFav ? "Saved in Favorites" : "Add Collection to Favorites"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Movies List Section */}
            <div className="moviesSection">
              <h2 className="sectionTitle">
                <FiFilm style={{ color: "var(--pink)", marginRight: 8 }} />
                Collection Movies ({parts.length})
              </h2>
              <div className="moviesGrid">
                {parts.map((movie) => (
                  <MovieCard key={movie.id} data={{ ...movie, media_type: "movie" }} mediaType="movie" />
                ))}
              </div>
            </div>
          </ContentWrapper>
        </>
      ) : (
        <ContentWrapper>
          <div className="errorNotice">Collection not found.</div>
        </ContentWrapper>
      )}
    </div>
  );
};

export default CollectionPage;
