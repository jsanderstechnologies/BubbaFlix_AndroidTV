import { createSlice } from "@reduxjs/toolkit";

const DEFAULT_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

export const homeSlice = createSlice({
  name: "home",
  initialState: {
    url: {
      backdrop: DEFAULT_IMAGE_BASE,
      poster: DEFAULT_IMAGE_BASE,
      profile: DEFAULT_IMAGE_BASE,
    },
    genres: {},
  },
  reducers: {
    getApiConfiguration: (state, action) => {
      state.url = {
        backdrop: action.payload?.backdrop || DEFAULT_IMAGE_BASE,
        poster: action.payload?.poster || DEFAULT_IMAGE_BASE,
        profile: action.payload?.profile || DEFAULT_IMAGE_BASE,
      };
    },
    getGenres: (state, action) => {
      state.genres = action.payload;
    },
  },
});

export const { getApiConfiguration, getGenres } = homeSlice.actions;

export default homeSlice.reducer;
