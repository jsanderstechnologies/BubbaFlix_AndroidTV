// Utility to preserve and restore poster D-pad focus & scroll position when returning from detail screens

export const saveLastClickedPoster = (id, type = "movie") => {
  if (!id) return;
  const key = `poster-${type}-${id}`;
  sessionStorage.setItem("last_clicked_poster_id", key);
};

export const restoreLastFocusedPoster = () => {
  const lastId = sessionStorage.getItem("last_clicked_poster_id");
  if (!lastId) return;

  const attemptFocus = (retries = 35) => {
    const el = document.getElementById(lastId) || document.querySelector(`[data-poster-id="${lastId}"]`);
    if (el) {
      el.focus({ preventScroll: false });
      if (typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
      sessionStorage.removeItem("last_clicked_poster_id");
    } else if (retries > 0) {
      setTimeout(() => attemptFocus(retries - 1), 150);
    } else {
      sessionStorage.removeItem("last_clicked_poster_id");
    }
  };

  attemptFocus();
};
