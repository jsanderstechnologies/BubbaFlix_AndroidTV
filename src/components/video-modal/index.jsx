/* eslint-disable react/prop-types */
import "./index.scss";

const VideoModal = ({ show, setShow, videoId, setVideoId }) => {
	const hidePopup = () => {
		setShow(false);
		setVideoId(null);
	};

	if (!show) return null;

	return (
		<div className={`videoPopup ${show ? "visible" : ""}`}>
			<div className="opacityLayer" onClick={hidePopup}></div>
			<div className="videoPlayer">
				<span
					className="closeBtn"
					tabIndex="0"
					role="button"
					onClick={hidePopup}
					onKeyDown={(e) => {
						const code = e.keyCode;
						if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
							e.preventDefault();
							hidePopup();
						}
					}}
				>
					Close
				</span>
				{videoId && (
					<iframe
						src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&controls=1&rel=0`}
						title="Trailer"
						width="100%"
						height="100%"
						style={{ border: "none" }}
						allow="autoplay; encrypted-media; fullscreen"
						allowFullScreen
					/>
				)}
			</div>
		</div>
	);
};

export default VideoModal;
