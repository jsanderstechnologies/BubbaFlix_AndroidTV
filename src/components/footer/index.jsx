import { useLocation } from "react-router-dom";
import "./index.scss";
import ContentWrapper from "../content-wrapper";

const Footer = () => {
  const location = useLocation();

  if (location.pathname !== "/about") {
    return null;
  }

  return (
    <footer className="footer">
      <ContentWrapper>
        <div className="infoText">
          © {new Date().getFullYear()} BubbaFlix. All rights reserved.
        </div>
      </ContentWrapper>
    </footer>
  );
};

export default Footer;
