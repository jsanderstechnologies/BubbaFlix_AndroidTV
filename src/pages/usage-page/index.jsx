import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { getServerUrl } from "../../utils/serverSettings";
import axios from "axios";
import TopNav from "../../components/top-nav";
import ContentWrapper from "../../components/content-wrapper";
import "./style.scss";
import { useNavigate } from "react-router-dom";
import Img from "../../components/lazy-load";
import { formatTimeDisplay } from "../../utils/watchProgress";

const UsagePage = () => {
    const { user } = useContext(AuthContext);
    const isAdmin = user?.role === "admin";
    const [usersData, setUsersData] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAdmin) {
            navigate("/");
            return;
        }

        const fetchUsage = async () => {
            try {
                const token = localStorage.getItem("bubbaflix_token");
                const res = await axios.get(`${getServerUrl()}/api/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsersData(res.data.users || []);
            } catch (err) {
                console.error("Failed to fetch users", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsage();
    }, [isAdmin, navigate]);

    // Enable PageUp / PageDown scrolling for TV remotes
    useEffect(() => {
        const handleKey = (e) => {
            if (e.keyCode === 33) { // PageUp
                e.preventDefault();
                window.scrollBy({ top: -window.innerHeight * 0.8, behavior: "smooth" });
            } else if (e.keyCode === 34) { // PageDown
                e.preventDefault();
                window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
            }
        };
        window.addEventListener("keydown", handleKey);
        // Add class to body so SCSS can re-enable scrolling
        document.body.classList.add("usagePageActive");
        return () => {
            window.removeEventListener("keydown", handleKey);
            document.body.classList.remove("usagePageActive");
        };
    }, []);

    const formatTimestamp = (ts) => {
        if (!ts) return "Unknown";
        return new Date(ts).toLocaleString();
    };

    return (
        <div className="usagePage">
            <TopNav />
            <ContentWrapper>
                <div className="usageHeader">
                    <h1>Usage Reports</h1>
                    <p>View watch history and progress for all registered users.</p>
                </div>

                {loading ? (
                    <div className="loadingText">Loading usage data...</div>
                ) : (
                    <div className="usersList">
                        {usersData.map((u) => {
                            const progressItems = Object.values(u.preferences?.watchProgress || {}).sort((a, b) => b.updatedAt - a.updatedAt);
                            
                            return (
                                <div key={u.id} className="userUsageCard">
                                    <div className="userCardHeader">
                                        <h2>{u.username} <span className="roleBadge">{u.role}</span></h2>
                                        <p>{progressItems.length} items watched or in progress</p>
                                    </div>
                                    
                                    {progressItems.length > 0 ? (
                                        <div className="progressGrid">
                                            {progressItems.map((item) => {
                                                const posterUrl = item.backdropPath || item.posterPath 
                                                    ? `https://image.tmdb.org/t/p/w500${item.backdropPath || item.posterPath}`
                                                    : "/no-poster.png";

                                                return (
                                                    <div key={item.key} className="progressItem">
                                                        <div className="posterWrapper">
                                                            <Img src={posterUrl} alt={item.title} />
                                                            <div className="progressOverlay">
                                                                <div 
                                                                    className="progressBar" 
                                                                    style={{ width: `${item.progressPercent}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="itemInfo">
                                                            <h4>{item.title}</h4>
                                                            {item.mediaType === "tv" && (
                                                                <span className="episodeInfo">S{item.seasonNum} E{item.episodeNum}</span>
                                                            )}
                                                            <div className="timeInfo">
                                                                {formatTimeDisplay(item.currentTime)} / {formatTimeDisplay(item.duration)} ({Math.round(item.progressPercent)}%)
                                                            </div>
                                                            <div className="dateInfo">
                                                                Last active: {formatTimestamp(item.updatedAt)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="noData">No watch activity yet.</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </ContentWrapper>
        </div>
    );
};

export default UsagePage;
