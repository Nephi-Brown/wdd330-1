const TMDB_KEY = 'c1a89be078d63cf07b398d0e7a71a591';
const OMDB_KEY = 'e564883a';
const TMDB = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w700';

function img(path){ return path ? `${IMG}${path}` : ''; }

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

export function normalizeMedia(m, type){
  const title = type === 'movie' ? m.title : m.name;
  const year = (type === 'movie' ? m.release_date : m.first_air_date || '').slice(0,4) || '';
  return {
    id: m.id,
    type,
    title,
    year,
    overview: m.overview || '',
    poster: img(m.poster_path),
    rating: m.vote_average ? Number(m.vote_average).toFixed(1) : '',
  };
}
