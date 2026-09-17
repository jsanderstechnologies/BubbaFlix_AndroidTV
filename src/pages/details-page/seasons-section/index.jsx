import { useState, useEffect, useRef } from "react";
import useFetch from "../../../hooks/useFetch";
import ContentWrapper from "../../../components/content-wrapper";
import MagnetSection from "../magnet-section";
import Img from "../../../components/lazy-load";
import PosterFallback from "../../../assets/no-poster.png";
import Spinner from "../../../components/spinner";
import WatchCheckmark from "../../../components/watch-checkmark";
import { isSimklWatched } from "../../../utils/simkl";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { FiTv, FiCalendar, FiClock, FiAlertCircle } from "react-icons/fi";
import "./index.scss";

const SeasonsSection = ({ tvId, seasons, showTitle, posterPath }) => {
  const { url } = useSelector((state) => state.home);

  const validSeasons = Array.isArray(seasons) && seasons.length > 0
    ? seasons.filter((s) => s.season_number > 0)
    : [{ id: 1, season_number: 1, name: "Season 1", episode_count: 8 }];

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);
  const hasAutoNavigatedSeason = useRef(false);
  const hasAutoNavigatedEpisode = useRef(false);

  // 1. Initial Load: Auto-select the first unwatched season
  useEffect(() => {
    if (hasAutoNavigatedSeason.current) return;
    if (!Array.isArray(seasons) || seasons.length === 0) return;

    const filtered = seasons.filter((s) => s.season_number > 0);
    if (filtered.length === 0) return;

    let targetSeasonNum = filtered[0].season_number;
    for (const s of filtered) {
      const isSeasonWatched = isSimklWatched({
        tmdbId: tvId,
        mediaType: "tv",
        seasonNum: s.season_number,
      });
      if (!isSeasonWatched) {
        targetSeasonNum = s.season_number;
        break;
      }
    }

    setSelectedSeasonNumber(targetSeasonNum);
    hasAutoNavigatedSeason.current = true;
  }, [seasons, tvId]);

  const { data: seasonData, loading, error } = useFetch(
    `/tv/${tvId}/season/${selectedSeasonNumber}`
  );

  // 2. Initial Load: Auto-scroll & focus the first unwatched episode in the selected season
  useEffect(() => {
    if (hasAutoNavigatedEpisode.current) return;
    if (!seasonData?.episodes || seasonData.episodes.length === 0) return;

    const firstUnwatchedEp = seasonData.episodes.find((ep) => {
      return !isSimklWatched({
        tmdbId: tvId,
        mediaType: "tv",
        seasonNum: selectedSeasonNumber,
        episodeNum: ep.episode_number,
      });
    });

    const targetEpNum = firstUnwatchedEp
      ? firstUnwatchedEp.episode_number
      : seasonData.episodes[0].episode_number;

    setTimeout(() => {
      const epElement = document.getElementById(`episode-card-${tvId}-s${selectedSeasonNumber}-e${targetEpNum}`);
      if (epElement) {
        epElement.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable = epElement.querySelector("button, select, input, [tabindex='0']");
        if (focusable) focusable.focus();
      }
    }, 350);

    hasAutoNavigatedEpisode.current = true;
  }, [seasonData, selectedSeasonNumber, tvId]);

  const today = dayjs();

  return (
    <div className="seasonsSection">
      <ContentWrapper>
        <div className="seasonsHeaderCard">
          <div className="titleArea">
            <h2 className="sectionHeading">
              <FiTv className="headingIcon" /> Seasons & Episodes
            </h2>
            <p className="subHeading">
              Select a season to view episodes and available episode streams.
            </p>
          </div>

          <div className="seasonControls">
            <div className="seasonPicker">
              <label htmlFor="seasonSelect">Select Season:</label>
              <select
                id="seasonSelect"
                className="seasonSelect"
                tabIndex="0"
                value={selectedSeasonNumber}
                onChange={(e) => setSelectedSeasonNumber(Number(e.target.value))}
              >
                {validSeasons.map((s) => {
                  const year = s.air_date ? s.air_date.substring(0, 4) : "";
                  const yearText = year ? ` (${year})` : "";
                  const countText = s.episode_count ? ` — ${s.episode_count} Episodes` : "";
                  return (
                    <option key={s.id || s.season_number} value={s.season_number} style={{ background: '#222', color: 'white' }}>
                      Season {s.season_number}{yearText}{countText}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Season Level Watched Checkmark */}
            <WatchCheckmark
              tmdbId={tvId}
              title={showTitle}
              mediaType="tv"
              seasonNum={selectedSeasonNumber}
              label={`Mark Season ${selectedSeasonNumber} Watched`}
              size="md"
              onToggle={(newStatus) => {
                if (newStatus === true) {
                  const currentIndex = validSeasons.findIndex(s => s.season_number === selectedSeasonNumber);
                  if (currentIndex !== -1 && currentIndex < validSeasons.length - 1) {
                    const nextSeasonNum = validSeasons[currentIndex + 1].season_number;
                    setSelectedSeasonNumber(nextSeasonNum);
                    setTimeout(() => {
                      const btn = document.querySelector('.seasonControls .watchCheckmark');
                      if (btn) btn.focus();
                    }, 100);
                  }
                }
              }}
            />
          </div>
        </div>

        {loading && (
          <div className="episodesLoading">
            <Spinner />
          </div>
        )}

        {!loading && (error || !seasonData?.episodes || seasonData.episodes.length === 0) && (
          <div className="noEpisodesNotice">
            <FiAlertCircle className="icon" />
            <span>No episode data returned for Season {selectedSeasonNumber}. Please select another season or try again.</span>
          </div>
        )}

        {!loading && seasonData?.episodes && seasonData.episodes.length > 0 && (
          <div className="episodesList">
            {seasonData.episodes.map((ep) => {
              const stillBase = url?.profile || "https://image.tmdb.org/t/p/original";
              const stillUrl = ep.still_path ? stillBase + ep.still_path : PosterFallback;
              const formattedDate = ep.air_date
                ? dayjs(ep.air_date).format("MMM D, YYYY")
                : "Air Date N/A";

              const isReleased = ep.air_date
                ? !dayjs(ep.air_date).isAfter(today, "day")
                : false;

              return (
                <div
                  key={ep.id}
                  id={`episode-card-${tvId}-s${selectedSeasonNumber}-e${ep.episode_number}`}
                  className="episodeCard"
                >
                  <div className="episodeMain">
                    <div className="stillBlock">
                      <Img className="stillImg" src={stillUrl} />
                    </div>

                    <div className="episodeInfo">
                      <div className="epHeader">
                        <span className="epBadge">
                          E{ep.episode_number}
                        </span>
                        <h3 className="epTitle">{ep.name}</h3>

                        {/* Episode Level Watched Checkmark */}
                        <WatchCheckmark
                          tmdbId={tvId}
                          title={showTitle}
                          mediaType="tv"
                          seasonNum={selectedSeasonNumber}
                          episodeNum={ep.episode_number}
                          label="Watched"
                          size="sm"
                        />
                      </div>

                      <div className="epMeta">
                        <span className="metaItem">
                          <FiCalendar /> {formattedDate}
                        </span>
                        {ep.vote_average > 0 && (
                          <span className="metaItem rating">
                            ⭐ {Number(ep.vote_average).toFixed(1)}
                          </span>
                        )}
                      </div>

                      <p className="epOverview">
                        {ep.overview || "No episode summary available."}
                      </p>
                    </div>
                  </div>

                  {/* Episode-Level Available Streams Dropdown */}
                  <div className="episodeStreams">
                    {isReleased ? (
                      <MagnetSection
                        title={showTitle}
                        seasonNum={selectedSeasonNumber}
                        episodeNum={ep.episode_number}
                        tmdbId={tvId}
                        mediaType="tv"
                        compact={true}
                        posterPath={posterPath}
                      />
                    ) : (
                      <div className="unreleasedNotice">
                        <FiClock className="clockIcon" />
                        <span>Unreleased Episode — Streams available after release on {formattedDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ContentWrapper>
    </div>
  );
};

export default SeasonsSection;
