// Movie & TV Show Favorites Utility
export const getFavorites = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("bubbaflix_favorites");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const isFavorite = (tmdbId, mediaType) => {
  if (!tmdbId) return false;
  const favs = getFavorites();
  const idStr = String(tmdbId);
  return favs.some((f) => String(f.id) === idStr && (!mediaType || f.media_type === mediaType || f.mediaType === mediaType));
};

export const toggleFavorite = (item) => {
  if (typeof window === "undefined" || !item || !item.id) return false;
  let favs = getFavorites();
  const idStr = String(item.id);
  const mediaType = item.media_type || item.mediaType || (item.name ? "tv" : "movie");

  const exists = favs.some((f) => String(f.id) === idStr && (f.media_type === mediaType || f.mediaType === mediaType));
  let isNowAdded = false;

  if (exists) {
    favs = favs.filter((f) => !(String(f.id) === idStr && (f.media_type === mediaType || f.mediaType === mediaType)));
    isNowAdded = false;
  } else {
    favs.unshift({
      id: item.id,
      media_type: mediaType,
      mediaType: mediaType,
      title: item.title || item.name,
      name: item.name || item.title,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
    });
    isNowAdded = true;
  }

  localStorage.setItem("bubbaflix_favorites", JSON.stringify(favs));
  window.dispatchEvent(new Event("bubbaflix_favorites_updated"));
  return isNowAdded;
};

// Live TV Favorite Channels Utility
export const getFavoriteChannels = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("bubbaflix_favorite_channels");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const toggleFavoriteChannel = (channelId) => {
  if (typeof window === "undefined" || !channelId) return false;
  const idStr = String(channelId);
  let favorites = getFavoriteChannels();
  let isFav = false;

  if (favorites.includes(idStr)) {
    favorites = favorites.filter((id) => id !== idStr);
    isFav = false;
  } else {
    favorites.push(idStr);
    isFav = true;
  }

  localStorage.setItem("bubbaflix_favorite_channels", JSON.stringify(favorites));
  window.dispatchEvent(new Event("favorite-channels-updated"));
  return isFav;
};

export const isFavoriteChannel = (channelId) => {
  if (!channelId) return false;
  const favorites = getFavoriteChannels();
  return favorites.includes(String(channelId));
};

// TMDB Collections Favorites Utility
export const getFavoriteCollections = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("bubbaflix_favorite_collections");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const isFavoriteCollection = (collectionId) => {
  if (!collectionId) return false;
  const list = getFavoriteCollections();
  const idStr = String(collectionId);
  return list.some((c) => String(c.id) === idStr);
};

export const toggleFavoriteCollection = (collectionObj) => {
  if (typeof window === "undefined" || !collectionObj || !collectionObj.id) return false;
  let list = getFavoriteCollections();
  const idStr = String(collectionObj.id);
  const exists = list.some((c) => String(c.id) === idStr);
  let isNowAdded = false;

  if (exists) {
    list = list.filter((c) => String(c.id) !== idStr);
    isNowAdded = false;
  } else {
    list.unshift({
      id: collectionObj.id,
      name: collectionObj.name || collectionObj.title,
      title: collectionObj.name || collectionObj.title,
      poster_path: collectionObj.poster_path,
      backdrop_path: collectionObj.backdrop_path,
      overview: collectionObj.overview,
      parts_count: collectionObj.parts?.length || collectionObj.parts_count || 0,
      media_type: "collection",
    });
    isNowAdded = true;

    // Automatically add all movies in the collection to Movie Favorites
    if (Array.isArray(collectionObj.parts) && collectionObj.parts.length > 0) {
      collectionObj.parts.forEach((movie) => {
        if (movie && movie.id && !isFavorite(movie.id, "movie")) {
          toggleFavorite({ ...movie, media_type: "movie" });
        }
      });
    } else {
      // Async fetch parts from TMDB API if not already present on card object
      import("./api").then(({ fetchDataFromAPI }) => {
        fetchDataFromAPI(`/collection/${collectionObj.id}`)
          .then((res) => {
            if (res && Array.isArray(res.parts)) {
              res.parts.forEach((movie) => {
                if (movie && movie.id && !isFavorite(movie.id, "movie")) {
                  toggleFavorite({ ...movie, media_type: "movie" });
                }
              });
            }
          })
          .catch(() => {});
      });
    }
  }

  localStorage.setItem("bubbaflix_favorite_collections", JSON.stringify(list));
  window.dispatchEvent(new Event("bubbaflix_favorites_updated"));
  return isNowAdded;
};
