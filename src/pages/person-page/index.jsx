import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import useFetch from "../../hooks/useFetch";
import ContentWrapper from "../../components/content-wrapper";
import Img from "../../components/lazy-load";
import MovieCard from "../../components/movie-card";
import TopNav from "../../components/top-nav";
import Spinner from "../../components/spinner";
import avatar from "../../assets/avatar.png";
import { FiArrowLeft } from "react-icons/fi";
import { isAdult } from "../../utils/filterUtils";
import "./index.scss";

const PersonPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { url } = useSelector((state) => state.home);

    const { data: person, loading: personLoading } = useFetch(`/person/${id}`);
    const { data: credits, loading: creditsLoading } = useFetch(`/person/${id}/combined_credits`);

    const [filteredCredits, setFilteredCredits] = useState([]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    useEffect(() => {
        if (credits?.cast) {
            const sorted = credits.cast
                .filter((item) => !isAdult(item))
                .sort((a, b) => b.popularity - a.popularity);
            
            const unique = [];
            const seen = new Set();
            for (const item of sorted) {
                if (!seen.has(item.id)) {
                    seen.add(item.id);
                    unique.push(item);
                }
            }
            setFilteredCredits(unique);
        }
    }, [credits]);

    return (
        <div className="personPage">
            <TopNav />
            <div className="backButtonWrapper">
                <ContentWrapper>
                    <button
                        className="backBtn"
                        onClick={() => navigate(-1)}
                        tabIndex="0"
                    >
                        <FiArrowLeft /> Back
                    </button>
                </ContentWrapper>
            </div>

            {(personLoading || creditsLoading) && <Spinner initial={true} />}

            {!personLoading && person && (
                <ContentWrapper>
                    <div className="personHeader">
                        <div className="left">
                            {person.profile_path ? (
                                <Img
                                    className="profileImg"
                                    src={url.profile + person.profile_path}
                                />
                            ) : (
                                <Img className="profileImg" src={avatar} />
                            )}
                        </div>
                        <div className="right">
                            <h1 className="name">{person.name}</h1>
                            {person.known_for_department && (
                                <div className="department">{person.known_for_department}</div>
                            )}
                            
                            {person.birthday && (
                                <div className="infoRow">
                                    <span className="label">Born: </span>
                                    <span className="value">
                                        {person.birthday}
                                        {person.place_of_birth && ` in ${person.place_of_birth}`}
                                    </span>
                                </div>
                            )}

                            {person.deathday && (
                                <div className="infoRow">
                                    <span className="label">Died: </span>
                                    <span className="value">{person.deathday}</span>
                                </div>
                            )}

                            {person.biography && (
                                <div className="biography">
                                    <h3 className="bioTitle">Biography</h3>
                                    <p className="bioText">{person.biography}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {filteredCredits.length > 0 && (
                        <div className="creditsSection">
                            <h3 className="sectionTitle">Known For</h3>
                            <div className="creditsGrid">
                                {filteredCredits.map((item, index) => {
                                    if (!item.poster_path) return null;
                                    return (
                                        <MovieCard
                                            key={`${item.id}-${index}`}
                                            data={item}
                                            mediaType={item.media_type}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </ContentWrapper>
            )}
        </div>
    );
};

export default PersonPage;
