import { useState } from "react";
import ContentWrapper from "../../../components/content-wrapper";
import SwichTabs from "../../../components/switch-tabs";
import useFetch from "../../../hooks/useFetch";
import Caraousel from "../../../components/caraousel";

const Trending = () => {
  const [endPoint, setEndPoint] = useState("day");

  const { data, loading } = useFetch(`/trending/all/${endPoint}`); //this format(for trending, popular, etc.) comes from tmdb documentation

  const onTabChange = (tab) => {
    console.log(tab);
    setEndPoint(tab === "Day" ? "day" : "week");
  };

  return (
    <div className="carouselSection">
      <ContentWrapper>
        <span className="carouselTitle">Trending</span>
        <SwichTabs data={["Day", "Week"]} onTabChange={onTabChange} />
      </ContentWrapper>
      <Caraousel data={data?.results} loading={loading} />
    </div>
  );
};

export default Trending;
