import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import { HiOutlineSearch, HiX } from "react-icons/hi";
import { FiFilm, FiTv, FiGrid, FiUser, FiMic, FiLayers } from "react-icons/fi";

import "./index.scss";

import { fetchDataFromAPI } from "../../utils/api";
import { filterEnglishMedia, filterEnglishCollections } from "../../utils/filterUtils";
import { restoreLastFocusedPoster } from "../../utils/focusManager";
import ContentWrapper from "../../components/content-wrapper";
import MovieCard from "../../components/movie-card";
import CollectionCard from "../../components/collection-card";
import Spinner from "../../components/spinner";
import TopNav from "../../components/top-nav";
import { getProxiedImageUrl } from "../../utils/serverSettings";

const POPULAR_TAGS = ["Action", "Comedy", "Marvel", "Sci-Fi", "Horror", "Drama", "Animation", "Thriller"];

const PersonCard = ({ person }) => {
  const navigate = useNavigate();
  const avatarUrl = person.profile_path
    ? getProxiedImageUrl(`https://image.tmdb.org/t/p/w500${person.profile_path}`)
    : "/assets/avatar.png";

  return (
    <div
      className="personCard"
      tabIndex={0}
      role="button"
      aria-label={person.name}
      onClick={() => navigate(`/search/${encodeURIComponent(person.name)}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/search/${encodeURIComponent(person.name)}`);
        }
      }}
    >
      <div className="personPoster">
        <img src={avatarUrl} alt={person.name} />
      </div>
      <div className="personDetails">
        <span className="personName">{person.name}</span>
        <span className="personRole">{person.known_for_department || "Actor / Cast"}</span>
      </div>
    </div>
  );
};

const SearchResult = () => {
  const { query: urlQuery } = useParams();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState(urlQuery || "");
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "movie", "tv", "person"
  const [data, setData] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const filterEnglishResults = (items) => {
    return filterEnglishMedia(items);
  };



  const handleVoiceSearch = () => {
    if (window.AndroidPlayer && typeof window.AndroidPlayer.startVoiceSearch === "function") {
      window.AndroidPlayer.startVoiceSearch();
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.onresult = (e) => {
          const transcript = e.results[0]?.[0]?.transcript;
          if (transcript) {
            setSearchQuery(transcript.trim());
            navigate(`/search/${encodeURIComponent(transcript.trim())}`, { replace: true });
          }
        };
        recognition.start();
      } else {
        alert("Voice search is not supported on this browser.");
      }
    }
  };

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setPageNum(1);
      fetchSearchResults(searchQuery.trim(), 1, activeFilter);
    } else {
      setData(null);
    }
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    restoreLastFocusedPoster();
  }, [data, activeFilter]);

  const filterEnglishCollections = (items) => {
    if (!Array.isArray(items)) return [];

    const adultKeywords = [
      "xxx", "adult", "erotic", "porn", "hentai", "nude", "sex", "uncensored", 
      "striptease", "playboy", "penthouse", "softcore", "hardcore", "erotica", "sensual"
    ];

    const foreignScriptRegex = /[\u0400-\u04FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uac00-\ud7af\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u0370-\u03FF]/;

    return items.filter((col) => {
      if (!col) return false;
      if (col.adult === true) return false;

      const name = (col.name || col.title || "").toLowerCase();
      const words = name.split(/\s+/);
      if (words.some((w) => adultKeywords.includes(w))) return false;
      if (adultKeywords.some((kw) => name.includes(kw))) return false;

      if (foreignScriptRegex.test(col.name || col.title || "")) return false;

      if (col.original_language) {
        const lang = col.original_language.toLowerCase();
        if (lang !== "en" && lang !== "eng") return false;
      }

      return true;
    });
  };

  const fetchNormalSearchResults = (queryStr, page, filterType) => {
    if (filterType === "collection") {
      fetchDataFromAPI(`/search/collection?query=${encodeURIComponent(queryStr)}&page=${page}`)
        .then((res) => {
          const colList = filterEnglishCollections(res?.results || []).map((item) => ({ ...item, media_type: "collection" }));
          setData({ ...res, results: colList });
          setPageNum(2);
          setLoading(false);
        })
        .catch(() => setLoading(false));
      return;
    }

    if (filterType === "all") {
      Promise.all([
        fetchDataFromAPI(`/search/multi?query=${encodeURIComponent(queryStr)}&page=${page}`),
        fetchDataFromAPI(`/search/collection?query=${encodeURIComponent(queryStr)}&page=${page}`),
      ])
        .then(([multiRes, colRes]) => {
          const multiList = filterEnglishResults(multiRes?.results || []);
          const colList = filterEnglishCollections(colRes?.results || []).map((item) => ({ ...item, media_type: "collection" }));
          setData({
            ...multiRes,
            results: [...colList, ...multiList],
          });
          setPageNum(2);
          setLoading(false);
        })
        .catch(() => setLoading(false));
      return;
    }

    let endpoint = `/search/multi?query=${encodeURIComponent(queryStr)}&page=${page}`;
    if (filterType === "movie") {
      endpoint = `/search/movie?query=${encodeURIComponent(queryStr)}&page=${page}`;
    } else if (filterType === "tv") {
      endpoint = `/search/tv?query=${encodeURIComponent(queryStr)}&page=${page}`;
    } else if (filterType === "person") {
      endpoint = `/search/person?query=${encodeURIComponent(queryStr)}&page=${page}`;
    }

    fetchDataFromAPI(endpoint)
      .then((res) => {
        const filtered = {
          ...res,
          results: filterEnglishResults(res?.results || []),
        };
        setData(filtered);
        setPageNum(2);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const fetchSearchResults = (queryStr, page, filterType) => {
    if (!queryStr) return;
    setLoading(true);

    if (page === 1) {
      Promise.all([
        fetchDataFromAPI(`/search/person?query=${encodeURIComponent(queryStr)}&page=1`),
        fetchDataFromAPI(`/search/movie?query=${encodeURIComponent(queryStr)}&page=1`)
      ])
        .then(([personRes, movieRes]) => {
          const topPerson = personRes?.results?.[0];
          const topMovie = movieRes?.results?.[0];

          const personPop = topPerson ? (topPerson.popularity || 0) : 0;
          const moviePop = topMovie ? (topMovie.popularity || 0) : 0;

          const queryLower = queryStr.toLowerCase();
          const personNameLower = topPerson ? topPerson.name.toLowerCase() : "";

          // Robust Actor Search Classification Heuristic:
          // Checks if the top matched person is highly popular relative to top movie results,
          // or is an exact match for the query, and meets minimum popularity criteria (> 6.0)
          const isActorSearch = topPerson && (
            personPop > 6.0 && (
              personPop > moviePop || 
              personNameLower === queryLower || 
              personNameLower.includes(queryLower) && moviePop < 15.0
            )
          );

          if (isActorSearch) {
            // Fetch combined credits for the actor
            fetchDataFromAPI(`/person/${topPerson.id}/combined_credits`)
              .then((creditsRes) => {
                const castList = creditsRes?.cast || [];
                const englishCast = filterEnglishResults(castList);

                const features = [];
                const biosAndDocs = [];

                englishCast.forEach((item) => {
                  const character = (item.character || "").toLowerCase();
                  const title = (item.title || item.name || "").toLowerCase();
                  const isDocGenre = Array.isArray(item.genre_ids) && item.genre_ids.includes(99);

                  const isBioOrDoc = 
                    isDocGenre || 
                    character === "himself" || 
                    character === "herself" || 
                    character.includes("archive footage") || 
                    character.includes("archival footage") || 
                    title.includes("documentary") || 
                    title.includes("biography") || 
                    title.includes("making of") || 
                    title.includes("behind the scenes") ||
                    title.includes("the story of");

                  if (isBioOrDoc) {
                    biosAndDocs.push(item);
                  } else {
                    features.push(item);
                  }
                });

                features.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                biosAndDocs.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

                setData({
                  results: [],
                  actorFeatures: features,
                  actorBiosDocs: biosAndDocs,
                  searchedActor: topPerson,
                });
                setLoading(false);
              })
              .catch(() => {
                fetchNormalSearchResults(queryStr, page, filterType);
              });
          } else {
            fetchNormalSearchResults(queryStr, page, filterType);
          }
        })
        .catch(() => {
          fetchNormalSearchResults(queryStr, page, filterType);
        });
      return;
    }

    fetchNormalSearchResults(queryStr, page, filterType);
  };

  const fetchNextPageData = () => {
    if (data?.searchedActor) return;
    const queryStr = searchQuery.trim();
    if (!queryStr) return;

    let endpoint = `/search/multi?query=${encodeURIComponent(queryStr)}&page=${pageNum}`;
    if (activeFilter === "movie") {
      endpoint = `/search/movie?query=${encodeURIComponent(queryStr)}&page=${pageNum}`;
    } else if (activeFilter === "tv") {
      endpoint = `/search/tv?query=${encodeURIComponent(queryStr)}&page=${pageNum}`;
    } else if (activeFilter === "person") {
      endpoint = `/search/person?query=${encodeURIComponent(queryStr)}&page=${pageNum}`;
    }

    fetchDataFromAPI(endpoint).then((res) => {
      const filteredNext = filterEnglishResults(res?.results || []);
      if (data?.results) {
        setData({
          ...data,
          results: [...data.results, ...filteredNext],
        });
      } else {
        setData({ ...res, results: filteredNext });
      }
      setPageNum((prev) => prev + 1);
    });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length > 0) {
      navigate(`/search/${encodeURIComponent(val.trim())}`, { replace: true });
    } else {
      navigate(`/search`, { replace: true });
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setData(null);
    navigate(`/search`, { replace: true });
    if (inputRef.current) inputRef.current.focus();
  };

  const handleTagClick = (tag) => {
    setSearchQuery(tag);
    navigate(`/search/${encodeURIComponent(tag)}`, { replace: true });
  };

  // Group filtered results into Movies, TV Shows, Actors, and Collections
  const isActorSearch = !!data?.searchedActor;

  const collectionsList = isActorSearch ? [] : (data?.results?.filter((item) => item.media_type === "collection" || activeFilter === "collection") || []);
  const moviesList = isActorSearch 
    ? (data?.actorFeatures?.filter((item) => item.media_type === "movie") || []) 
    : (data?.results?.filter((item) => item.media_type === "movie" || activeFilter === "movie") || []);
  const tvList = isActorSearch 
    ? (data?.actorFeatures?.filter((item) => item.media_type === "tv") || []) 
    : (data?.results?.filter((item) => item.media_type === "tv" || activeFilter === "tv") || []);
  const peopleList = isActorSearch 
    ? [data.searchedActor] 
    : (data?.results?.filter((item) => item.media_type === "person" || activeFilter === "person") || []);

  const actorBiosDocsFiltered = isActorSearch 
    ? (data?.actorBiosDocs?.filter((item) => {
        if (activeFilter === "movie") return item.media_type === "movie";
        if (activeFilter === "tv") return item.media_type === "tv";
        return true;
      }) || [])
    : [];

  return (
    <div className="searchResultsPage">
      <TopNav />
      <ContentWrapper>
        {/* Dedicated Search Header & Input Box */}
        <div className="searchHeaderSection">
          <div className="searchTitleBlock">
            <h1>Search Movies, TV Shows & Collections</h1>
            <p>Find movies, TV series, franchise collections, and actors</p>
          </div>

          <div className="searchInputWrapper">
            <HiOutlineSearch className="searchIcon" />
            <input
              ref={inputRef}
              type="text"
              className="mainSearchInput"
              placeholder="Type movie, TV show, collection, or actor name..."
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.keyCode === 13) {
                  e.preventDefault();
                  if (inputRef.current) inputRef.current.blur();
                  // Optional: tell AndroidPlayer specifically to hide if we want
                  if (window.AndroidPlayer && typeof window.AndroidPlayer.hideKeyboard === "function") {
                    window.AndroidPlayer.hideKeyboard();
                  }
                }
              }}
              onClick={() => {
                if (window.AndroidPlayer && typeof window.AndroidPlayer.showKeyboard === "function") {
                  window.AndroidPlayer.showKeyboard();
                }
              }}
              tabIndex="0"
            />
            <button
              type="button"
              className="voiceSearchBtn"
              onClick={handleVoiceSearch}
              tabIndex="0"
              title="Voice Search"
              aria-label="Voice Search"
            >
              <FiMic />
            </button>
            {searchQuery.length > 0 && (
              <button
                className="clearSearchBtn"
                onClick={handleClear}
                tabIndex="0"
                aria-label="Clear Search"
              >
                <HiX />
              </button>
            )}
          </div>

          {/* Filter Type Chips */}
          <div className="searchFilterChips">
            <button
              className={`chip ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
              tabIndex="0"
            >
              <FiGrid /> All Results
            </button>
            <button
              className={`chip ${activeFilter === "collection" ? "active" : ""}`}
              onClick={() => setActiveFilter("collection")}
              tabIndex="0"
            >
              <FiLayers /> Collections ({collectionsList.length})
            </button>
            <button
              className={`chip ${activeFilter === "movie" ? "active" : ""}`}
              onClick={() => setActiveFilter("movie")}
              tabIndex="0"
            >
              <FiFilm /> Movies ({moviesList.length})
            </button>
            <button
              className={`chip ${activeFilter === "tv" ? "active" : ""}`}
              onClick={() => setActiveFilter("tv")}
              tabIndex="0"
            >
              <FiTv /> TV Series ({tvList.length})
            </button>
            <button
              className={`chip ${activeFilter === "person" ? "active" : ""}`}
              onClick={() => setActiveFilter("person")}
              tabIndex="0"
            >
              <FiUser /> Actors & Cast ({peopleList.length})
            </button>
          </div>

          {/* Popular Tag Quick Suggestions */}
          {!searchQuery && (
            <div className="popularTagsBlock">
              <span className="tagsLabel">POPULAR SEARCHES:</span>
              <div className="tagsRow">
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    className="tagBtn"
                    onClick={() => handleTagClick(tag)}
                    tabIndex="0"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Results Display Area */}
        {searchQuery.trim().length > 0 && (
          <>
            {loading && !data ? (
              <Spinner initial={true} />
            ) : (data?.results?.length > 0 || (isActorSearch && ((data?.actorFeatures?.length || 0) > 0 || (data?.actorBiosDocs?.length || 0) > 0))) ? (
              <InfiniteScroll
                className="infiniteScrollContainer"
                dataLength={isActorSearch ? ((data?.actorFeatures?.length || 0) + (data?.actorBiosDocs?.length || 0)) : (data?.results?.length || 0)}
                next={fetchNextPageData}
                hasMore={isActorSearch ? false : (pageNum <= data?.total_pages)}
                loader={<Spinner />}
              >
                {/* 1. Movie Collections Category Section */}
                {(activeFilter === "all" || activeFilter === "collection") && collectionsList.length > 0 && (
                  <div className="searchCategorySection">
                    <h2 className="categoryTitle"><FiLayers style={{ marginRight: 8, color: "var(--pink)" }} /> Movie Collections & Franchises</h2>
                    <div className="contentGrid">
                      {collectionsList.map((col, idx) => (
                        <CollectionCard key={`collection-${col.id}-${idx}`} data={col} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Movies Category Section */}
                {(activeFilter === "all" || activeFilter === "movie") && moviesList.length > 0 && (
                  <div className="searchCategorySection">
                    <h2 className="categoryTitle">
                      <FiFilm style={{ marginRight: 8, color: "var(--pink)" }} /> 
                      {isActorSearch ? `${data.searchedActor.name}'s Feature Movies` : "Movies"}
                    </h2>
                    <div className="contentGrid">
                      {moviesList.map((item, idx) => (
                        <MovieCard key={`movie-${item.id}-${idx}`} data={item} fromSearch={true} mediaType="movie" />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. TV Shows Category Section */}
                {(activeFilter === "all" || activeFilter === "tv") && tvList.length > 0 && (
                  <div className="searchCategorySection">
                    <h2 className="categoryTitle">
                      <FiTv style={{ marginRight: 8, color: "var(--pink)" }} /> 
                      {isActorSearch ? `${data.searchedActor.name}'s TV Shows & Series` : "TV Shows & Series"}
                    </h2>
                    <div className="contentGrid">
                      {tvList.map((item, idx) => (
                        <MovieCard key={`tv-${item.id}-${idx}`} data={item} fromSearch={true} mediaType="tv" />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2.5 Biographies, Documentaries & Specials Section */}
                {isActorSearch && (activeFilter === "all" || activeFilter === "movie" || activeFilter === "tv") && actorBiosDocsFiltered.length > 0 && (
                  <div className="searchCategorySection">
                    <h2 className="categoryTitle">
                      <FiUser style={{ marginRight: 8, color: "var(--pink)" }} />
                      Biographies, Documentaries & Specials ({data.searchedActor.name})
                    </h2>
                    <div className="contentGrid">
                      {actorBiosDocsFiltered.map((item, idx) => (
                        <MovieCard key={`actor-bio-doc-${item.id}-${idx}`} data={item} fromSearch={true} mediaType={item.media_type} />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Actors & Cast Category Section */}
                {(activeFilter === "all" || activeFilter === "person") && peopleList.length > 0 && (
                  <div className="searchCategorySection">
                    <h2 className="categoryTitle"><FiUser style={{ marginRight: 8, color: "var(--pink)" }} /> Actors & Cast</h2>
                    <div className="contentGrid">
                      {peopleList.map((person, idx) => (
                        <PersonCard key={`person-${person.id}-${idx}`} person={person} />
                      ))}
                    </div>
                  </div>
                )}
              </InfiniteScroll>
            ) : (
              !loading && (
                <div className="noResultsBox">
                  <h3>No English titles or actors found for &quot;{searchQuery}&quot;</h3>
                  <p>Try searching for another movie, TV series, or actor name.</p>
                </div>
              )
            )}
          </>
        )}
      </ContentWrapper>
    </div>
  );
};

export default SearchResult;
