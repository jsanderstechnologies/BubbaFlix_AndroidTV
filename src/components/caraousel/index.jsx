/* eslint-disable react/prop-types */
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import dayjs from "dayjs";

import ContentWrapper from "../content-wrapper";
import Img from "../lazy-load";
import PosterFallback from "../../assets/no-poster.png";
import CircleRating from "../circle-rating";

import "./index.scss";

const Carousel = ({ data, loading, endpoint, title }) => {
	const { url } = useSelector((state) => state.home);
	const navigate = useNavigate();

	const skItem = () => {
		return (
			<div className="skeletonItem">
				<div className="posterBlock skeleton"></div>
				<div className="textBlock">
					<div className="title skeleton"></div>
					<div className="date skeleton"></div>
				</div>
			</div>
		);
	};

	return (
		<div className="carousel">
			<ContentWrapper>
				{title && <div className="carouselTitle">{title}</div>}
				{!loading ? (
					<div className="carouselItems">
						{data?.map((item) => {
							const posterBase = url?.poster || "https://image.tmdb.org/t/p/original";
							const posterUrl = item.poster_path
								? posterBase + item.poster_path
								: PosterFallback;
							return (
								<div
									key={item.id}
									className="carouselItem"
									tabIndex="0"
									role="button"
									onClick={() =>
										navigate(
											`/${item.media_type || endpoint}/${
												item.id
											}`
										)
									}
									onKeyDown={(e) => {
										const code = e.keyCode;
										if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
											e.preventDefault();
											navigate(
												`/${item.media_type || endpoint}/${
													item.id
												}`
											);
										}
									}}
								>
									<div className="posterBlock">
										<Img src={posterUrl} />
										<CircleRating
											rating={Number(item.vote_average || 0).toFixed(
												1
											)}
										/>
									</div>
									<div className="textBlock">
										<span className="title">
											{item.title || item.name}
										</span>
										<span className="date">
											{dayjs(
												item.release_date ||
													item.first_air_date
											).format("MMM D, YYYY")}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				) : (
					<div className="loadingSkeleton">
						{skItem()}
						{skItem()}
						{skItem()}
						{skItem()}
						{skItem()}
					</div>
				)}
			</ContentWrapper>
		</div>
	);
};

export default Carousel;
