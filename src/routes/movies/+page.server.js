import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

const API = 'https://api.themoviedb.org';
const MAX_PAGES = 25;
const detailsCache = new Map();

// Whole-payload cache. Without it, every server reload (including each time you
// edit this file in `npm run dev`) re-fires 100+ TMDB requests. Short in dev so
// new favourites / ratings show up quickly; longer in production.
const PAYLOAD_TTL = dev ? 60_000 : 5 * 60_000;
let payloadCache = null;

const headers = () => ({
	Authorization: `Bearer ${env.TMDB_ACCESS_TOKEN}`,
	Accept: 'application/json'
});

async function tmdb(fetch, path) {
	let response;
	try {
		response = await fetch(`${API}${path}`, { headers: headers() });
	} catch {
		// network drop / DNS / timeout: report it cleanly instead of an unhandled "Internal Error"
		throw error(502, 'Could not reach TMDB');
	}

	if (!response.ok) {
		throw error(response.status, `TMDB request failed (${response.status})`);
	}

	return response.json();
}

// For enrichments the page can live without (ratings, favourites): never break the page.
async function tmdbOptional(fetch, path) {
	try {
		return await tmdb(fetch, path);
	} catch {
		return null;
	}
}

async function movieDetails(fetch, id) {
	if (detailsCache.has(id)) return detailsCache.get(id);

	try {
		const response = await fetch(`${API}/3/movie/${id}?language=en-US`, { headers: headers() });
		if (!response.ok) return null;
		const details = await response.json();
		detailsCache.set(id, details); // only successful lookups are remembered
		return details;
	} catch {
		return null;
	}
}

// All pages of a v4 account collection: 'rated' or 'favorites'
async function accountMovies(fetch, accountId, kind) {
	const base = `/4/account/${encodeURIComponent(accountId)}/movie/${kind}`;
	const query = 'language=en-US&sort_by=created_at.asc';
	let first;
	try {
		first = await tmdb(fetch, `${base}?page=1&${query}`);
	} catch (err) {
		// never break the page, but say why in the terminal
		console.warn(`[tmdb] ${kind} unavailable: ${err?.status ?? ''} ${err?.body?.message ?? err?.message ?? err}`);
		return [];
	}

	const extraPages = Array.from(
		{ length: Math.max(0, Math.min(first.total_pages ?? 1, MAX_PAGES) - 1) },
		(_, index) => index + 2
	);
	const rest = await Promise.all(
		extraPages.map((page) => tmdbOptional(fetch, `${base}?page=${page}&${query}`))
	);

	return [first, ...rest].flatMap((page) => page?.results ?? []);
}

function watchedDateFromComment(comment = '') {
	const value = String(comment);
	const labelledDate = value.match(/watched\s*[:=\-]?\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
	const bareDate = value.trim().match(/^(\d{4}-\d{2}-\d{2})$/)?.[1];
	const date = labelledDate ?? bareDate ?? '';

	if (!date || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return '';
	return date;
}

async function enrichMovies(fetch, movies) {
	const enriched = [];

	for (let index = 0; index < movies.length; index += 8) {
		const batch = movies.slice(index, index + 8);
		const details = await Promise.all(
			batch.map((movie) => movieDetails(fetch, movie.id))
		);

		for (let itemIndex = 0; itemIndex < batch.length; itemIndex += 1) {
			const movie = batch[itemIndex];
			const detail = details[itemIndex];
			enriched.push({
				...movie,
				// `||` not `??`: list items carry runtime 0, which `??` would keep,
				// so the real runtime from the details call was never used.
				runtime: Number(movie.runtime || detail?.runtime || 0),
				language: detail?.spoken_languages?.[0]?.english_name
					?? detail?.original_language
					?? movie.language
					?? 'Unknown'
			});
		}
	}

	return enriched;
}

async function buildPayload(fetch, listId) {
	const [firstPage, genreData] = await Promise.all([
		tmdb(fetch, `/4/list/${listId}?page=1&language=en-US&sort_by=created_at.asc`),
		tmdb(fetch, '/3/genre/movie/list?language=en-US')
	]);

	const remainingPages = Array.from(
		{ length: Math.max(0, Math.min(firstPage.total_pages ?? 1, MAX_PAGES) - 1) },
		(_, index) => index + 2
	);
	const pages = await Promise.all(
		remainingPages.map((page) =>
			tmdb(fetch, `/4/list/${listId}?page=${page}&language=en-US&sort_by=created_at.asc`)
		)
	);

	const accountId = firstPage.created_by?.id;
	const [ratedMovies, favoriteMovies] = accountId
		? await Promise.all([
				accountMovies(fetch, accountId, 'rated'),
				accountMovies(fetch, accountId, 'favorites')
			])
		: [[], []];

	const genreNames = Object.fromEntries(
		(genreData.genres ?? []).map((genre) => [genre.id, genre.name])
	);
	const listPages = [firstPage, ...pages];
	const comments = Object.assign(
		{},
		...listPages.map((page) => page.comments ?? {})
	);
	const personalRatings = new Map(
		ratedMovies
			.map((movie) => [movie.id, Number(movie.account_rating?.value ?? 0)])
			.filter(([, rating]) => rating > 0)
	);
	const favoriteIds = new Set(favoriteMovies.map((movie) => movie.id));

	const baseItems = listPages
		.flatMap((page) => page.results ?? [])
		.filter((item) => item.media_type !== 'tv')
		.map((movie) => ({
			id: movie.id,
			title: movie.title ?? movie.original_title ?? 'Untitled',
			releaseDate: movie.release_date ?? '',
			language: movie.original_language ?? '',
			personalRating: personalRatings.get(movie.id) ?? null,
			favorite: favoriteIds.has(movie.id),
			posterPath: movie.poster_path ?? null,
			runtime: Number(movie.runtime ?? 0),
			watchedDate: watchedDateFromComment(
				comments[`movie:${movie.id}`] ?? movie.comment
			),
			genres: (movie.genre_ids ?? []).map((id) => genreNames[id] ?? `Genre ${id}`),
			url: `https://www.themoviedb.org/movie/${movie.id}`
		}));
	const items = await enrichMovies(fetch, baseItems);

	if (dev) {
		console.log(
			`[tmdb] account ${accountId ?? 'NOT FOUND on list'} · rated ${ratedMovies.length} · ` +
				`favourites ${favoriteMovies.length} on account, ${items.filter((m) => m.favorite).length} of them in this list ` +
				`(${items.length} films total)`
		);
	}

	return {
		list: {
			name: firstPage.name ?? 'My movie list',
			description: firstPage.description ?? '',
			itemCount: items.length
		},
		movies: items
	};
}

export async function load({ fetch, setHeaders }) {
	if (!env.TMDB_ACCESS_TOKEN || !env.TMDB_LIST_ID) {
		throw error(500, 'TMDB_ACCESS_TOKEN and TMDB_LIST_ID must be set');
	}

	const listId = String(env.TMDB_LIST_ID).trim();
	if (!/^\d+$/.test(listId)) {
		throw error(500, 'TMDB_LIST_ID must contain digits only');
	}

	// the browser should not hold stale data while developing
	if (!dev) setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=3600' });

	if (payloadCache && Date.now() - payloadCache.time < PAYLOAD_TTL) {
		return payloadCache.data;
	}

	try {
		const data = await buildPayload(fetch, listId);
		payloadCache = { time: Date.now(), data };
		return data;
	} catch (err) {
		// TMDB hiccup: serve the last good copy instead of a 500
		if (payloadCache) return payloadCache.data;
		throw err;
	}
}