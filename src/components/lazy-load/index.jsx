/* eslint-disable react/prop-types */
import { LazyLoadImage } from "react-lazy-load-image-component";
import "react-lazy-load-image-component/src/effects/blur.css";

import { getProxiedImageUrl } from "../../utils/serverSettings";

const Img = ({ src, classname, className }) => {
  const finalSrc = src?.includes("image.tmdb.org") ? getProxiedImageUrl(src) : src;
  return (
    <LazyLoadImage className={className || classname || ""} alt="" src={finalSrc} effect="blur" />
  );
};

export default Img;
