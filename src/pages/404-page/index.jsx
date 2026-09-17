import "./index.scss";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";

const PageNotFound = () => {
	return (
		<div className="pageNotFound">
			<TopNav />
			<ContentWrapper>
				<span className="bigText">404</span>
				<span className="smallText">Page not found!</span>
			</ContentWrapper>
		</div>
	);
};

export default PageNotFound;
