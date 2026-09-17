/* eslint-disable react/prop-types */
import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiLayers } from "react-icons/fi";
import dayjs from "dayjs";
import useFetch from "../../../hooks/useFetch";
import ContentWrapper from "../../../components/content-wrapper";
import CircleRating from "../../../components/circle-rating";
import Img from "../../../components/lazy-load";
import PosterFallback from "../../../assets/no-poster.png";
import VideoModal from "../../../components/video-modal";
import WatchCheckmark from "../../../components/watch-checkmark";
import FavoriteStar from "../../../components/favorite-star";
import MagnetSection from "../magnet-section";
import { PlayIcon } from "../../../components/play-btn";
import "./index.scss";

const DetailsBanner = ({ video, crew }) => {
	const { user } = useContext(AuthContext);
	const disableBg = (localStorage.getItem("disable_backgrounds") !== null ? JSON.parse(localStorage.getItem("disable_backgrounds")) : null) ?? user?.preferences?.disableBackgrounds ?? false;
	const [show, setShow] = useState(false);
	const [videoId, setVideoId] = useState(null);

	const { mediaType, id } = useParams();
	const navigate = useNavigate();
	const { data, loading } = useFetch(`/${mediaType}/${id}`);

	const { url } = useSelector((state) => state.home);

	const director = crew?.filter((f) => f.job === "Director");
	const writer = crew?.filter(
		(f) => f.job === "Screenplay" || f.job === "Story" || f.job === "Writer"
	);

	const toHoursAndMinutes = (totalMinutes) => {
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
	};

	return (
		<div className="detailsBanner">
			{!loading ? (
				<div>
					{!!data && !disableBg && (
						<div className="backdrop-img">
							<Img src={(url?.backdrop || "https://image.tmdb.org/t/p/original") + data?.backdrop_path} />
						</div>
					)}
					<div className="opacity-layer"></div>
					<ContentWrapper>
						<div className="content">
							<div className="left">
								{data?.poster_path ? (
									<Img
										className="posterImg"
										src={(url?.poster || "https://image.tmdb.org/t/p/original") + data.poster_path}
									/>
								) : (
									<Img
										className="posterImg"
										src={PosterFallback}
									/>
								)}
							</div>
							<div className="right">
								<div className="title">
									{`${data?.name || data?.title} (${dayjs(
										data?.release_date || data?.first_air_date
									).format("YYYY")})`}
								</div>

								<div className="subtitle">
									{data?.tagline}
								</div>

								<div className="row">
									<CircleRating
										rating={data?.vote_average?.toFixed(1)}
									/>
									<div
										className="playbtn"
										tabIndex="0"
										role="button"
										onClick={() => {
											setShow(true);
											if (video?.key) setVideoId(video.key);
										}}
										onKeyDown={(e) => {
											const code = e.keyCode;
											if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
												e.preventDefault();
												setShow(true);
												if (video?.key) setVideoId(video.key);
											}
										}}
									>
										<PlayIcon />
										<span className="text">
											Watch Trailer
										</span>
									</div>

									{/* Watch Checkmark Button */}
									<WatchCheckmark
										tmdbId={id}
										title={data?.title || data?.name}
										mediaType={mediaType}
										label="Watched"
										size="lg"
									/>

									{/* Favorite Star Toggle Button */}
									<FavoriteStar
										item={data}
										tmdbId={id}
										mediaType={mediaType}
										size="lg"
									/>
								</div>

								{/* Stream Dropbox Section - Positioned directly above Overview for Movies */}
								{mediaType === "movie" && (
									<div className="movieStreamWrapper" style={{ margin: "20px 0" }}>
										<MagnetSection
											title={data?.title || data?.name}
											year={dayjs(data?.release_date || data?.first_air_date).format("YYYY")}
											tmdbId={id}
											mediaType={mediaType}
											compact={true}
											posterPath={data?.poster_path}
										/>
									</div>
								)}

								{mediaType === "movie" && data?.belongs_to_collection && (
									<div className="collectionBannerSection">
										<div className="collectionBannerContent">
											<div className="collectionBannerLeft">
												<FiLayers className="collectionLayersIcon" />
												<div className="collectionTextWrapper">
													<span className="collectionSubtext">Part of the Franchise</span>
													<h3 className="collectionTitleText">{data.belongs_to_collection.name}</h3>
												</div>
											</div>
											<button
												className="viewCollectionBtn"
												onClick={() => navigate(`/collection/${data.belongs_to_collection.id}`)}
												tabIndex="0"
											>
												View Franchise
											</button>
										</div>
									</div>
								)}

								<div className="overview">
									<div className="heading">Overview</div>
									<div className="description">
										{data?.overview}
									</div>
								</div>

								<div className="info">
									{data?.status && (
										<div className="infoItem">
											<span className="text bold">
												Status
											</span>
											<span className="text">
												{data?.status}
											</span>
										</div>
									)}
									{data?.release_date && (
										<div className="infoItem">
											<span className="text bold">
												Release Date
											</span>
											<span className="text">
												{dayjs(
													data?.release_date
												).format("MMM D, YYYY")}
											</span>
										</div>
									)}
									{data?.runtime && (
										<div className="infoItem">
											<span className="text bold">
												Runtime
											</span>
											<span className="text">
												{toHoursAndMinutes(
													data?.runtime
												)}
											</span>
										</div>
									)}
								</div>

								{director?.length > 0 && (
									<div className="info">
										<span className="text bold">
											Director
										</span>
										<span className="text">
											{director?.map((item, index) => (
												<span key={index}>
													{item.name}
													{director?.length - 1 !==
														index && ", "}
												</span>
											))}
										</span>
									</div>
								)}

								{writer?.length > 0 && (
									<div className="info">
										<span className="text bold">
											Writer
										</span>
										<span className="text">
											{writer?.map((item, index) => (
												<span key={index}>
													{item.name}
													{writer?.length - 1 !==
														index && ", "}
												</span>
											))}
										</span>
									</div>
								)}

								{data?.created_by?.length > 0 && (
									<div className="info">
										<span className="text bold">
											Creator
										</span>
										<span className="text">
											{data?.created_by?.map(
												(item, index) => (
													<span key={index}>
														{item.name}
														{data?.created_by
															?.length -
															1 !==
															index && ", "}
													</span>
												)
											)}
										</span>
									</div>
								)}
							</div>
						</div>

						<VideoModal
							show={show}
							setShow={setShow}
							videoId={videoId}
							setVideoId={setVideoId}
						/>
					</ContentWrapper>
				</div>
			) : (
				<div className="detailsBannerSkeleton">
					<ContentWrapper>
						<div className="left skeleton"></div>
						<div className="right">
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
						</div>
					</ContentWrapper>
				</div>
			)}
		</div>
	);
};

export default DetailsBanner;
