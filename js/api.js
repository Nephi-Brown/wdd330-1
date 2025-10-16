const TMDB_KEY = 'c1a89be078d63cf07b398d0e7a71a591';
const OMDB_KEY = 'e564883a';
const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';

function img(path){ return path ? `${IMG}${path}` : ''; }

// --- ADD: genre cache + helpers ---
const _genreCache = { movie: null, tv: null };

export async function getGenreMap(kind /* 'movie' | 'tv' */) {
  if (_genreCache[kind]) return _genreCache[kind];
  const data = await tmdb(`genre/${kind}/list`);
  const map = Object.fromEntries((data.genres || []).map(g => [g.id, g.name]));
  _genreCache[kind] = map;
  return map;
}

function _normalizeWithMap(raw, type, genreMap = {}) {
  const t = type || raw.media_type || (raw.title ? 'movie' : 'tv');
  const typeLabel = t === 'movie' ? 'Movie' : 'TV';
  const idsFromRaw =
    raw.genre_ids ||
    (Array.isArray(raw.genres) ? raw.genres.map(g => g.id) : []);
  const genres = (idsFromRaw || []).map(id => genreMap[id]).filter(Boolean);

  return {
    id: raw.id,
    type: t,
    typeLabel,
    title: raw.title || raw.name || 'Untitled',
    year: (raw.release_date || raw.first_air_date || '').slice(0, 4) || '',
    poster: raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : '',
    rating: typeof raw.vote_average === 'number' ? raw.vote_average.toFixed(1) : null,
    genres
  };
}


export async function tmdb(path, params = {}){
  const url = new URL(`${TMDB}/${path}`);
  url.searchParams.set('api_key', TMDB_KEY);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url); if(!res.ok) throw new Error('TMDb error');
  return res.json();
}

export async function omdb(params = {}){
  const url = new URL('https://www.omdbapi.com/');
  url.searchParams.set('apikey', OMDB_KEY);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url); if(!res.ok) throw new Error('OMDb error');
  return res.json();
}

export async function normalizeMedia(raw, type) {
  const gmap = await getGenreMap(type || raw.media_type || 'movie');
  return _normalizeWithMap(raw, type, gmap);
}

export async function toMediaList(results, type /* optional */) {
  const list = Array.isArray(results) ? results : [];
  if (type === 'movie' || type === 'tv') {
    const gmap = await getGenreMap(type);
    return list.map(r => _normalizeWithMap(r, type, gmap));
  }
  const movieMap = await getGenreMap('movie');
  const tvMap = await getGenreMap('tv');
  return list.map(r =>
    _normalizeWithMap(r, r.media_type, r.media_type === 'movie' ? movieMap : tvMap)
  );
}