import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { HiOutlineSearch, HiOutlineFilm } from "react-icons/hi";
import { AiFillStar } from "react-icons/ai";
import { FiSettings, FiHome, FiTv, FiInfo, FiVideo, FiLogOut } from "react-icons/fi";
import { AuthContext } from "../../context/AuthContext";
import { useContext } from "react";
import ContentWrapper from "../content-wrapper";
import "./index.scss";

const TopNav = () => {
	const [query, setQuery] = useState("");
	const navigate = useNavigate();
	const { logout, user } = useContext(AuthContext);
	const location = useLocation();

	const handleSearch = (e) => {
		const code = e.keyCode;
		if ((e.key === "Enter" || code === 13 || code === 23 || code === 66) && query.trim().length > 0) {
			e.preventDefault();
			navigate(`/search/${encodeURIComponent(query.trim())}`);
		}
	};

	const handleSearchClick = () => {
		if (query.trim().length > 0) {
			navigate(`/search/${encodeURIComponent(query.trim())}`);
		}
	};

	const isActive = (path) => {
		const current = location.pathname;
		
		if (path === "/") {
			// Home is active only if it is exactly "/" or not in any other known section
			return current === "/" ? "active" : "";
		}
		
		if (path === "/explore/movie") {
			// Movies tab is active for explore/movie OR movie details OR collections
			return (current.startsWith("/explore/movie") || current.startsWith("/movie/") || current.startsWith("/collection/")) ? "active" : "";
		}
		
		if (path === "/explore/tv") {
			// TV Series tab is active for explore/tv OR tv details
			return (current.startsWith("/explore/tv") || current.startsWith("/tv/")) ? "active" : "";
		}
		
		if (path === "/search") {
			// Search tab is active for search homepage OR search results
			return current.startsWith("/search") ? "active" : "";
		}
		
		if (path === "/favorites") {
			return current.startsWith("/favorites") ? "active" : "";
		}

		if (path === "/settings") {
			return current.startsWith("/settings") ? "active" : "";
		}

		if (path === "/about") {
			return current.startsWith("/about") ? "active" : "";
		}

		return current === path ? "active" : "";
	};

	return (
		<nav className="topNav">
			<ContentWrapper>
				<div className="topNavInner">
					{/* App Logo - Non-focusable branding display */}
					<div className="navLogo" style={{ pointerEvents: "none", userSelect: "none" }}>
						<img src="/logo.png" alt="BubbaFlix TV" tabIndex="-1" style={{ pointerEvents: "none" }} />
					</div>

					{/* Navigation Item Links */}
					<div className="navLinks">
						<button
							className={`navBtn ${isActive("/")}`}
							tabIndex="0"
							onClick={() => navigate("/")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/");
								}
							}}
						>
							<FiHome className="navIcon" />
							<span>Home</span>
						</button>

						<button
							className={`navBtn ${isActive("/search")}`}
							tabIndex="0"
							onClick={() => navigate("/search")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/search");
								}
							}}
						>
							<HiOutlineSearch className="navIcon" />
							<span>Search</span>
						</button>

						<button
							className={`navBtn ${isActive("/favorites")}`}
							tabIndex="0"
							onClick={() => navigate("/favorites")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/favorites");
								}
							}}
						>
							<AiFillStar className="navIcon" style={{ color: "#ffd700" }} />
							<span>Favorites</span>
						</button>

						<button
							className={`navBtn ${isActive("/explore/movie")}`}
							tabIndex="0"
							onClick={() => navigate("/explore/movie")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/explore/movie");
								}
							}}
						>
							<HiOutlineFilm className="navIcon" />
							<span>Movies</span>
						</button>

						<button
							className={`navBtn ${isActive("/explore/tv")}`}
							tabIndex="0"
							onClick={() => navigate("/explore/tv")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/explore/tv");
								}
							}}
						>
							<FiTv className="navIcon" />
							<span>TV Series</span>
						</button>

						
  						{user?.role === "admin" && (
  						<button
  							className={`navBtn ${isActive("/usage")}`}
  							tabIndex="0"
  							onClick={() => navigate("/usage")}
  							onKeyDown={(e) => {
  								if (e.key === "Enter" || e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 66) {
  									e.preventDefault();
  									navigate("/usage");
  								}
  							}}
  						>
  							<FiInfo /> Usage
  						</button>
  						)}

  						<button
							className={`navBtn ${isActive("/settings")}`}
							tabIndex="0"
							onClick={() => navigate("/settings")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/settings");
								}
							}}
						>
							<FiSettings className="navIcon" />
							<span>Settings</span>
						</button>

						<button
							className={`navBtn ${isActive("/about")}`}
							tabIndex="0"
							onClick={() => navigate("/about")}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									navigate("/about");
								}
							}}
						>
							<FiInfo className="navIcon" />
							<span>About</span>
						</button>

						<button
							className="navBtn"
							tabIndex="0"
							onClick={logout}
							onKeyDown={(e) => {
								const code = e.keyCode;
								if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
									e.preventDefault();
									logout();
								}
							}}
						>
							<FiLogOut className="navIcon" />
							<span>Sign Out</span>
						</button>
  
					</div>
				</div>
			</ContentWrapper>
		</nav>
	);
};

export default TopNav;
