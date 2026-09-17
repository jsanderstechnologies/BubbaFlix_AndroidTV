/* eslint-disable no-unused-vars */
import "./index.scss";
import React, { useState, useEffect } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { AiFillStar } from "react-icons/ai";
import { SlMenu } from "react-icons/sl";
import { VscChromeClose } from "react-icons/vsc";
import { useNavigate, useLocation } from "react-router-dom";
import { FiSettings } from "react-icons/fi";
import ContentWrapper from "../content-wrapper";

const Header = () => {
	const [show, setShow] = useState("top");
	const [mobileMenu, setMobileMenu] = useState(false);
	const [query, setQuery] = useState("");
	const [showSearch, setShowSearch] = useState(false);
	const [isReadOnly, setIsReadOnly] = useState(true);
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		window.scrollTo(0, 0);
		const timer = setTimeout(() => {
			if (
				!document.body.classList.contains("videoPlayerActive") &&
				!document.body.classList.contains("detailsPageActive")
			) {
				const activeEl = document.querySelector(".menuItem.active");
				if (activeEl) {
					activeEl.focus();
				}
			}
		}, 120);
		return () => clearTimeout(timer);
	}, [location]);

	const searchQuery = (e) => {
		const code = e.keyCode;
		if ((e.key === "Enter" || code === 13 || code === 23 || code === 66) && query.trim().length > 0) {
			navigate(`search/${query.trim()}`);
			setShowSearch(false);
		}
	};

	const openSearch = () => {
		setShowSearch((prev) => !prev);
		setIsReadOnly(true);
		setMobileMenu(false);
		setShow("show");
	};

	const openMobileMenu = () => {
		setShowSearch(false);
		setMobileMenu((prev) => !prev);
		setShow("show");
	};

	const handleNavigation = (navigationType) => {
		if (navigationType === "home") {
			navigate("/");
		} else if (navigationType === "search") {
			navigate("/search");
		} else if (navigationType === "favorites") {
			navigate("/favorites");
		} else if (navigationType === "movies") {
			navigate("/explore/movie");
		} else if (navigationType === "tvShows") {
			navigate("/explore/tv");
		} else if (navigationType === "settings") {
			navigate("/settings");
		} else if (navigationType === "about") {
			navigate("/about");
		}
		setMobileMenu(false);
	};

	const handleKeyActivate = (e, callback) => {
		const code = e.keyCode;
		if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
			e.preventDefault();
			callback();
		}
	};

	const path = location.pathname;
	const isHome = path === "/";
	const isSearch = path.startsWith("/search");
	const isFavorites = path.startsWith("/favorites");
	const isMovies = path.startsWith("/explore/movie");
	const isTvShows = path.startsWith("/explore/tv");
	const isSettings = path.startsWith("/settings");
	const isAbout = path.startsWith("/about");

	return (
		<header
			className={`header ${mobileMenu ? "mobileView" : ""} ${show}`}
		>
			<ContentWrapper>
				<div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
					<img src="/tv_banner.png" alt="BubbaFlix TV" />
				</div>

				<ul className="menuItems">
					<li
						className={`menuItem ${isHome ? "active" : ""}`}
						tabIndex="0"
						role="button"
						onClick={() => handleNavigation("home")}
						onKeyDown={(e) => handleKeyActivate(e, () => handleNavigation("home"))}
					>
						Home
					</li>
					<li
						className={`menuItem ${isSearch ? "active" : ""}`}
						tabIndex="0"
						role="button"
						onClick={() => handleNavigation("search")}
						onKeyDown={(e) => handleKeyActivate(e, () => handleNavigation("search"))}
					>
						<HiOutlineSearch style={{ marginRight: 6 }} /> Search
					</li>
					<li
						className={`menuItem ${isFavorites ? "active" : ""}`}
						tabIndex="0"
						role="button"
						onClick={() => handleNavigation("favorites")}
						onKeyDown={(e) => handleKeyActivate(e, () => handleNavigation("favorites"))}
					>
						<AiFillStar style={{ marginRight: 6, color: "#ffd700" }} /> Favorites
					</li>
					<li
						className={`menuItem ${isMovies ? "active" : ""}`}
						tabIndex="0"
						role="button"
						onClick={() => handleNavigation("movies")}
						onKeyDown={(e) => handleKeyActivate(e, () => handleNavigation("movies"))}
					>
						Movies
					</li>
					<li
						className={`menuItem ${isTvShows ? "active" : ""}`}
						tabIndex="0"
						role="button"
						onClick={() => handleNavigation("tvShows")}
						onKeyDown={(e) => handleKeyActivate(e, () => handleNavigation("tvShows"))}
					>
						TV Shows
					</li>
					<li
						className={`menuItem ${isSettings ? "active" : ""}`}
						tabIndex="0"
						role="button"
						onClick={() => handleNavigation("settings")}
						onKeyDown={(e) => handleKeyActivate(e, () => handleNavigation("settings"))}
						title="Settings"
					>
						<FiSettings style={{ marginRight: 6 }} /> Settings
					</li>
					<li
						className={`menuItem ${isAbout ? "active" : ""}`}
						tabIndex="0"
						role="button"
						onClick={() => handleNavigation("about")}
						onKeyDown={(e) => handleKeyActivate(e, () => handleNavigation("about"))}
					>
						About
					</li>
				</ul>

				<div className="mobileMenuItems">
					<button
						className="headerIconBtn"
						tabIndex="0"
						aria-label="Open Search"
						onClick={openSearch}
						onKeyDown={(e) => handleKeyActivate(e, openSearch)}
					>
						<HiOutlineSearch />
					</button>
					<button
						className="headerIconBtn"
						tabIndex="0"
						aria-label="Toggle Mobile Menu"
						onClick={openMobileMenu}
						onKeyDown={(e) => handleKeyActivate(e, openMobileMenu)}
					>
						{mobileMenu ? <VscChromeClose /> : <SlMenu />}
					</button>
				</div>
			</ContentWrapper>

			{showSearch && (
				<div className="searchBar">
					<ContentWrapper>
						<div className="searchInput">
							<input
								type="text"
								tabIndex="0"
								placeholder="Search for movies or tv shows.."
								value={query}
								readOnly={isReadOnly}
								onChange={(e) => setQuery(e.target.value)}
								onFocus={() => {
									setIsReadOnly(false);
								}}
								onClick={() => {
									setIsReadOnly(false);
									if (window.AndroidPlayer && typeof window.AndroidPlayer.showKeyboard === "function") {
										window.AndroidPlayer.showKeyboard();
									}
								}}
								onBlur={() => setIsReadOnly(true)}
								onKeyDown={(e) => {
									const code = e.keyCode;
									if (e.key === "Enter" || code === 13 || code === 23 || code === 66) {
										if (isReadOnly) {
											e.preventDefault();
											setIsReadOnly(false);
											if (window.AndroidPlayer && typeof window.AndroidPlayer.showKeyboard === "function") {
												window.AndroidPlayer.showKeyboard();
											}
										} else {
											searchQuery(e);
										}
									}
								}}
							/>
							<button
								className="closeSearchBtn"
								tabIndex="0"
								aria-label="Close Search"
								onClick={() => setShowSearch(false)}
								onKeyDown={(e) => handleKeyActivate(e, () => setShowSearch(false))}
							>
								<VscChromeClose />
							</button>
						</div>
					</ContentWrapper>
				</div>
			)}
		</header>
	);
};

export default Header;
