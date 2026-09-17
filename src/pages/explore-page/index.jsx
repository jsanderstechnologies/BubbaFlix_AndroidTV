import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";

import "./index.scss";

import { fetchDataFromAPI } from "../../utils/api";
import { filterEnglishMedia, filterEnglishCollections } from "../../utils/filterUtils";
import { filterCollectionsWithGroq, filterExploreMediaWithGroq } from "../../utils/groqFilter";
import { restoreLastFocusedPoster } from "../../utils/focusManager";
import ContentWrapper from "../../components/content-wrapper";
import MovieCard from "../../components/movie-card";
import CollectionCard from "../../components/collection-card";
import Spinner from "../../components/spinner";
import TopNav from "../../components/top-nav";
import { FiSliders, FiLayers, FiFilm } from "react-icons/fi";

let filters = {};
let cachedCollections = null;

const getSortOptions = (mediaType) => [
	{ value: "popularity.desc", label: "Sort by Popularity (High to Low)" },
	{ value: "vote_average.desc", label: "Sort by Rating (Top Rated)" },
	{ value: "primary_release_date.desc", label: "Sort by Release Date (Newest)" },
	{ value: mediaType === "tv" ? "name.asc" : "original_title.asc", label: "Sort Alphabetically (A-Z)" },
	{ value: mediaType === "tv" ? "name.desc" : "original_title.desc", label: "Sort Alphabetically (Z-A)" },
	{ value: "popularity.asc", label: "Sort by Popularity (Low to High)" },
	{ value: "vote_average.asc", label: "Sort by Rating (Lowest)" },
	{ value: "primary_release_date.asc", label: "Sort by Release Date (Oldest)" },
];

const COLLECTION_KEYWORDS = [
	"marvel", "avengers", "star", "dark", "harry", "potter", "fast", "furious", "dragon", 
	"spider", "batman", "godzilla", "jurassic", "disney", "pixar", "x-men", "matrix", "rings", 
	"chronicles", "dead", "alien", "predator", "terminator", "pirates", "transformers", "star trek", 
	"dune", "indiana", "bond", "shrek", "toy", "despicable", "ice", "hunger", "twilight", "divergent", 
	"maze", "blade", "resident", "underworld", "saw", "scream", "conjuring", "insidious", "annabelle", 
	"purge", "destination", "halloween", "friday", "elm", "chucky", "psycho", "jaws", "rocky", "creed", 
	"rambo", "hard", "lethal", "weapon", "bad boys", "rush hour", "beverly hills", "men in black", 
	"ghostbusters", "back future", "karate kid", "ocean", "the", "a", "o"
];

const Explore = () => {
	const [data, setData] = useState(null);
	const [pageNum, setPageNum] = useState(1);
	const [loading, setLoading] = useState(false);
		const [sortby, setSortby] = useState("popularity.desc");
	
	// Movies vs Collections Sub-Tabs
	const [movieTab, setMovieTab] = useState(() => sessionStorage.getItem("explore_movie_tab") || "movies");
	
	// Collections Infinite Scroll State
	const [collectionsList, setCollectionsList] = useState([]);
	const [colKeywordIndex, setColKeywordIndex] = useState(0);
	const [colSubPage, setColSubPage] = useState(1);
	const [colLoading, setColLoading] = useState(false);
	const [colHasMore, setColHasMore] = useState(true);

	const { mediaType } = useParams();

	const fetchInitialData = () => {
		setLoading(true);
		fetchDataFromAPI(`/discover/${mediaType}`, filters).then(async (res) => {
			let filtered = filterEnglishMedia(res?.results || []);
			filtered = await filterExploreMediaWithGroq(filtered, mediaType);
			setData({ ...res, results: filtered });
			setPageNum((prev) => prev + 1);
			setLoading(false);
		});
	};

	const fetchNextPageData = () => {
		fetchDataFromAPI(
			`/discover/${mediaType}?page=${pageNum}`,
			filters
		).then(async (res) => {
			let filteredNext = filterEnglishMedia(res?.results || []);
			filteredNext = await filterExploreMediaWithGroq(filteredNext, mediaType);
			
			// We have to use a functional state update to ensure we don't capture stale `data`
			setData((prevData) => {
				if (prevData?.results) {
					return {
						...prevData,
						results: [...prevData.results, ...filteredNext],
					};
				} else {
					return { ...res, results: filteredNext };
				}
			});
			setPageNum((prev) => prev + 1);
		});
	};

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

	const fetchNextCollectionsPage = () => {
		if (colLoading || !colHasMore) return;
		setColLoading(true);

		const currentKw = COLLECTION_KEYWORDS[colKeywordIndex] || "movie";

		fetchDataFromAPI(`/search/collection?query=${encodeURIComponent(currentKw)}&page=${colSubPage}`)
			.then(async (res) => {
				let fetchedCols = filterEnglishCollections(res?.results || []);
				fetchedCols = await filterCollectionsWithGroq(fetchedCols);

				setCollectionsList((prev) => {
					const existingIds = new Set(prev.map((c) => c.id));
					const uniqueNew = fetchedCols.filter((c) => !existingIds.has(c.id));
					return [...prev, ...uniqueNew];
				});

				if (colSubPage < (res?.total_pages || 1) && colSubPage < 3) {
					setColSubPage((prev) => prev + 1);
				} else {
					setColSubPage(1);
					if (colKeywordIndex + 1 < COLLECTION_KEYWORDS.length) {
						setColKeywordIndex((prev) => prev + 1);
					} else {
						setColHasMore(false);
					}
				}
				setColLoading(false);
			})
			.catch(() => {
				setColLoading(false);
			});
	};

	useEffect(() => {
		filters = { 
			sort_by: "popularity.desc",
			with_original_language: "en",
			"vote_count.gte": 10
		};
		setData(null);
		setPageNum(1);
		setSortby("popularity.desc");
		const savedTab = sessionStorage.getItem("explore_movie_tab") || "movies";
		setMovieTab(savedTab);
		fetchInitialData();

		if (mediaType === "movie") {
			setColKeywordIndex(0);
			setColSubPage(1);

			if (cachedCollections) {
				setCollectionsList(cachedCollections);
				setColHasMore(false);
			} else {
				setCollectionsList([]);
				setColHasMore(true);
				setColLoading(true);

				const allTopColIds = [
					86311, 263, 10, 1241, 9485, 328, 645,
					528, 295, 131292, 8650, 119, 87096, 403374, 84,
					2150, 86066, 422834, 2602, 1570, 2562, 2980, 33514,
					1771, 748, 531241, 9125, 10194, 147573, 121938, 8093,
					9400, 22005, 185966, 405, 87086, 131084, 312, 37525,
					333036, 41604, 9005, 10243, 8657, 9283, 367296, 231598,
					472147, 279023, 10137, 91361, 91363, 91362, 9284, 313,
					404609, 477156, 468222, 8945, 1733, 885, 470369, 1158,
					157409, 9718, 251786, 558216, 10214, 10227, 10215, 10230,
					382285
				];

				Promise.all(allTopColIds.map((id) => fetchDataFromAPI(`/collection/${id}`).catch(() => null)))
					.then((list) => {
						const validCols = list.filter(Boolean);
						
						validCols.forEach(col => {
							col.calculatedPopularity = Array.isArray(col.parts)
								? col.parts.reduce((sum, p) => sum + (p.popularity || 0), 0)
								: (col.popularity || 0);
						});

						validCols.sort((a, b) => b.calculatedPopularity - a.calculatedPopularity);

						const filtered = filterEnglishCollections(validCols);
						cachedCollections = filtered;
						setCollectionsList(filtered);
						setColHasMore(false);
						setColLoading(false);
					})
					.catch(() => {
						setColLoading(false);
					});
			}
		}
	}, [mediaType]);

	useEffect(() => {
		if (movieTab === "collections" && collectionsList.length === 0) {
			// fallback/trigger if not initialized
		}
	}, [movieTab]);

	useEffect(() => {
		restoreLastFocusedPoster();
	}, [data, collectionsList, movieTab]);

	const handleSortChange = (e) => {
		const val = e.target.value;
		setSortby(val);
		if (val) {
			filters.sort_by = val;
		} else {
			delete filters.sort_by;
		}
		setPageNum(1);
		fetchInitialData();
	};

	return (
		<div className="explorePage">
			<TopNav />
			<ContentWrapper>
				<div className="pageHeader">
					<div className="pageTitle">
						{mediaType === "tv"
							? "Explore TV Series"
							: movieTab === "collections"
							? "Explore Movie Collections"
							: "Explore Movies"}
					</div>

					<div className="exploreTabSwitcher" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "15px" }}>
						{mediaType === "movie" && (
							<div className="typeTabs" style={{ display: "flex", gap: "10px" }}>
								<button
									className={`tabBtn ${movieTab === "movies" ? "active" : ""}`}
									onClick={() => {
										setMovieTab("movies");
										sessionStorage.setItem("explore_movie_tab", "movies");
									}}
									tabIndex="0"
								>
									<FiFilm /> Movies
								</button>
								<button
									className={`tabBtn ${movieTab === "collections" ? "active" : ""}`}
									onClick={() => {
										setMovieTab("collections");
										sessionStorage.setItem("explore_movie_tab", "collections");
									}}
									tabIndex="0"
								>
									<FiLayers /> Collections
								</button>
							</div>
						)}
						
						{!(mediaType === "movie" && movieTab === "collections") && (
							<div className="sortTabs" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
								<div className="tabBtn selectContainer" style={{ padding: 0, position: "relative", overflow: "hidden", border: "none", cursor: "pointer" }}>
									<div style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
										<FiSliders style={{ marginRight: "6px" }}/> Sort:
									</div>
									<select
										className="tvSortSelect"
										value={sortby}
										onChange={(e) => {
											const val = e.target.value;
											setSortby(val);
											if (val) {
												filters.sort_by = val;
											} else {
												delete filters.sort_by;
											}
											setPageNum(1);
											fetchInitialData();
										}}
										tabIndex="0"
										style={{ 
											appearance: "none", 
											background: "transparent", 
											border: "none", 
											color: "rgba(255, 255, 255, 0.7)", 
											padding: "10px 40px 10px 90px", 
											fontSize: "14px", 
											fontWeight: 600, 
											cursor: "pointer", 
											outline: "none", 
											width: "100%",
											height: "100%"
										}}
									>
										{getSortOptions(mediaType).map((opt) => (
											<option key={opt.value} value={opt.value} style={{ background: '#222', color: 'white' }}>
												{opt.label}
											</option>
										))}
									</select>
									<div style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
										▼
									</div>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Collections Tab Content with Infinite Scroll */}
				{mediaType === "movie" && movieTab === "collections" ? (
					<InfiniteScroll
						className="content"
						dataLength={collectionsList.length}
						next={fetchNextCollectionsPage}
						hasMore={colHasMore}
						loader={<Spinner />}
					>
						{collectionsList.map((col, idx) => (
							<CollectionCard key={`col-${col.id}-${idx}`} data={col} />
						))}
					</InfiniteScroll>
				) : (
					/* Movies / TV Tab Content with Infinite Scroll */
					<>
						{loading && <Spinner initial={true} />}
						{!loading && (
							<>
								{data?.results?.length > 0 ? (
									<InfiniteScroll
										className="content"
										dataLength={data?.results?.length || 0}
										next={fetchNextPageData}
										hasMore={pageNum <= data?.total_pages}
										loader={<Spinner />}
									>
										{data?.results?.map((item, index) => {
											if (item.media_type === "person") return null;
											return (
												<MovieCard
													key={`${item.id}-${index}`}
													data={item}
													mediaType={mediaType}
												/>
											);
										})}
									</InfiniteScroll>
								) : (
									<span className="resultNotFound">
										Sorry, no media titles found matching your request.
									</span>
								)}
							</>
						)}
					</>
				)}
			</ContentWrapper>
		</div>
	);
};

export default Explore;
