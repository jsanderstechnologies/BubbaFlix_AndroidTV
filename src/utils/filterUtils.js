// Global Filtering Utility to exclude Anime, Non-English Foreign Content, Adult Material, and API/Axios Errors

export const isAxiosError = (item) => {
  if (!item || typeof item !== "object") return true;
  if (item instanceof Error) return true;
  if (item.isAxiosError || item.response || item.config || item.code === "ERR_BAD_REQUEST" || item.message) return true;
  return false;
};

// Non-English language & non-Latin script detection
const FOREIGN_SCRIPT_REGEX = /[\u0400-\u04FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uac00-\ud7af\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u0370-\u03FF\u0590-\u05FF\u1EA0-\u1EF9]/;

const FOREIGN_TITLE_TERMS = [
  "coleccion", "colección", "trilogie", "trilogía", "trilogia", "tetralogia", "pentalogia",
  "filmreihe", "série", "serie", "película", "pelicula", "peliculas", "películas",
  "collection (fr)", "collection (french)", "collection (es)", "collection (spanish)",
  "collection (de)", "collection (german)", "collection (it)", "collection (italian)",
  "collection (ru)", "collection (russian)", "collection (ja)", "collection (japanese)",
  "collection (ko)", "collection (korean)", "collection (zh)", "collection (chinese)",
  "subbed", "dubbed", "subtitulado", "subtitulada", "version fr", "version es", "vf", "vostfr",
  "cinéma", "cine", "filme", "filmes", "volumen", "bilingual", "subs"
];

const NON_ENGLISH_COUNTRIES = [
  "JP", "CN", "KR", "RU", "FR", "DE", "ES", "IT", "IN", "TR", "TH", "MX", "BR", "AR", "PL", "NL", "SE", "DK", "NO", "FI", "GR", "CZ", "HU", "RO"
];

export const isAnime = (item) => {
  if (!item || isAxiosError(item)) return false;

  // 1. Japanese language check
  if (item.original_language) {
    const lang = item.original_language.toLowerCase();
    if (lang === "ja" || lang === "jpn" || lang === "japanese") return true;
  }

  // 2. Origin country check (Japan)
  if (Array.isArray(item.origin_country) && item.origin_country.includes("JP")) {
    return true;
  }

  // 3. Known Anime titles & terms in title, name, original_name, or overview
  const title = (item.title || item.name || item.original_title || item.original_name || "").toLowerCase();
  const overview = (item.overview || "").toLowerCase();

  const animeKeywords = [
    "anime", "manga", "hentai", "otaku", "studio ghibli", "ghibli", "dragon ball", "dragonball",
    "naruto", "one piece", "bleach", "attack on titan", "shingeki", "demon slayer", "kimetsu",
    "my hero academia", "boku no hero", "jujutsu kaisen", "death note", "tokyo ghoul", "pokemon",
    "pokémon", "yu-gi-oh", "yugioh", "digimon", "sailor moon", "gundam", "evangelion",
    "fullmetal alchemist", "hunter x hunter", "hunter hunter", "sword art online", "fairy tail",
    "boruto", "chainsaw man", "spy x family", "solo leveling", "jojo's bizarre", "berserk",
    "cowboy bebop", "code geass", "inuyasha", "steins;gate", "one punch", "mob psycho", "blue lock",
    "slayer", "isakai", "isekai", "overlord", "crunchyroll", "fate/stay", "monogatari", "re:zero",
    "re zero", "ecchi", "waifu", "senpai", "doraemon", "shin-chan", "detective conan", "lupin",
    "beyblade", "bakugan", "saint seiya", "inazuma", "yo-kai", "haikyuu", "kuroko", "toriko",
    "gintama", "ranma", "astro boy", "macross", "voltron", "speed racer", "rurouni", "kenshin",
    "yu yu hakusho", "initial d", "cardcaptor", "trigun", "hellsing", "claymore", "elfen lied",
    "black clover", "fire force", "dr. stone", "promised neverland", "tokyo revengers", "vinland",
    "golden kamuy", "baki", "kengan", "mashle", "frieren", "dungeon meshi", "apothecary",
    "classroom of the elite", "bungo stray", "sound! euphonium", "violet evergarden", "anohana",
    "clannad", "your name", "weathering with you", "suzume", "silent voice", "spirited away",
    "my neighbor totoro", "princess mononoke", "howl's moving", "castle in the sky", "nausicaa",
    "kiki's delivery", "porco rosso", "ponyo", "wind rises", "boy and the heron"
  ];

  if (animeKeywords.some((kw) => title.includes(kw) || overview.includes(kw))) {
    return true;
  }

  return false;
};

const ADULT_KEYWORDS = [
  "xxx", "adult", "erotic", "porn", "hentai", "nude", "sex", "uncensored", 
  "striptease", "playboy", "penthouse", "softcore", "hardcore", "erotica", "sensual",
  "taboo", "fetish", "babe", "vixen", "desire", "passion", "lust", "naughty", "explicit",
  "18+", "snuff", "escort", "swingers", "playmate", "hustler", "suicidegirls", "brazzers",
  "orgy", "threesome", "incest", "gangbang", "bdsm"
];

export const isAdult = (item) => {
  if (!item || isAxiosError(item)) return false;
  if (item.adult === true) return true;

  const title = (item.title || item.name || item.original_title || item.original_name || "").toLowerCase();
  const overview = (item.overview || "").toLowerCase();

  const words = title.split(/[\s,._\-:;]+/);
  if (words.some((w) => ADULT_KEYWORDS.includes(w))) return true;
  if (ADULT_KEYWORDS.some((kw) => title.includes(kw) || overview.includes(kw))) return true;

  return false;
};

export const filterEnglishMedia = (items) => {
  if (!Array.isArray(items)) return [];

  return items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    if (isAxiosError(item)) return false;

    // Filter out explicit adult and softcore
    if (isAdult(item)) return false;

    // Filter out Anime
    if (isAnime(item)) return false;

    // Filter out unreleased/junk media with 0.0 rating
    if (item.vote_average === 0 || item.vote_average === 0.0) return false;

    // Retain Person entries in search
    if (item.media_type === "person") return true;

    // 1. Primary Rule: Enforce English, BUT allow universally popular international hits (like The Fifth Element, Parasite)
    if (item.original_language) {
      const lang = item.original_language.toLowerCase();
      if (lang !== "en" && lang !== "eng") {
        if (!item.vote_count || item.vote_count < 1500) {
          return false;
        }
      }
    }

    // 2. Non-Latin character script check (Cyrillic, CJK, Arabic, Hindi, etc.)
    const title = item.title || item.name || item.original_title || item.original_name || "";
    if (!title || FOREIGN_SCRIPT_REGEX.test(title)) return false;

    // 3. Foreign title descriptor terms check (e.g. "coleccin", "trilogie", "pelcula")
    const titleLower = title.toLowerCase();
    if (FOREIGN_TITLE_TERMS.some((term) => titleLower.includes(term))) {
      return false;
    }

    // 4. Country check ONLY if original_language is not explicitly English
    if (!item.original_language && Array.isArray(item.origin_country) && item.origin_country.length > 0) {
      const hasEnglishCountry = item.origin_country.some((c) => ["US", "GB", "CA", "AU", "NZ", "IE"].includes(c));
      if (!hasEnglishCountry && item.origin_country.some((c) => NON_ENGLISH_COUNTRIES.includes(c))) {
        return false;
      }
    }

    return true;
  });
};

export const filterEnglishCollections = (items) => {
  if (!Array.isArray(items)) return [];

  return items.filter((col) => {
    if (!col || typeof col !== "object") return false;
    if (isAxiosError(col)) return false;
    
    // Filter out explicit adult and softcore
    if (isAdult(col)) return false;

    // Filter out Anime collections
    if (isAnime(col)) return false;

    // Primary Rule: If original_language is present, enforce English ("en" or "eng")
    if (col.original_language) {
      const lang = col.original_language.toLowerCase();
      if (lang !== "en" && lang !== "eng") return false;
    }

    const name = (col.name || col.title || col.original_name || "").toLowerCase();
    if (!name) return false;

    // Foreign character script check
    if (FOREIGN_SCRIPT_REGEX.test(col.name || col.title || col.original_name || "")) return false;

    // Foreign title descriptor terms check
    if (FOREIGN_TITLE_TERMS.some((term) => name.includes(term))) {
      return false;
    }

    return true;
  });
};
