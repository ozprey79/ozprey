import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API = 'https://api.themoviedb.org';
const detailsCache = new Map();

async function tmdb(fetch, path) {
	const response = await fetch(`${API}${path}`, {
		headers: {
			Authorization: `Bearer ${env.TMDB_ACCESS_TOKEN}`,
			Accept: 'application/json'
		}
	});

	if (!response.ok) {
		throw error(response.status, `TMDB request failed (${response.status})`);
	}

	return response.json();
}

async function movieDetails(fetch, id) {
	if (detailsCache.has(id)) return detailsCache.get(id);

	const response = await fetch(`${API}/3/movie/${id}?language=en-US`, {
		headers: {
			Authorization: `Bearer ${env.TMDB_ACCESS_TOKEN}`,
			Accept: 'application/json'
		}
	});
	const details = response.ok ? await response.json() : null;
	detailsCache.set(id, details);
	return details;
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
				runtime: Number(movie.runtime ?? detail?.runtime ?? 0),
				language: detail?.spoken_languages?.[0]?.english_name
					?? detail?.original_language
					?? movie.language
					?? 'Unknown'
			});
		}
	}

	return enriched;
}

export async function load({ fetch, setHeaders }) {
	if (!env.TMDB_ACCESS_TOKEN || !env.TMDB_LIST_ID) {
		throw error(500, 'TMDB_ACCESS_TOKEN and TMDB_LIST_ID must be set');
	}

	const listId = String(env.TMDB_LIST_ID).trim();
	if (!/^\d+$/.test(listId)) {
		throw error(500, 'TMDB_LIST_ID must contain digits only');
	}

	const [firstPage, genreData] = await Promise.all([
		tmdb(fetch, `/4/list/${listId}?page=1&language=en-US&sort_by=created_at.asc`),
		tmdb(fetch, '/3/genre/movie/list?language=en-US')
	]);

	const remainingPages = Array.from(
		{ length: Math.max(0, Math.min(firstPage.total_pages ?? 1, 25) - 1) },
		(_, index) => index + 2
	);
	const pages = await Promise.all(
		remainingPages.map((page) =>
			tmdb(fetch, `/4/list/${listId}?page=${page}&language=en-US&sort_by=created_at.asc`)
		)
	);
	const accountId = firstPage.created_by?.id;
	let ratedPages = [];

	if (accountId) {
		const firstRatedPage = await tmdb(
			fetch,
			`/4/account/${encodeURIComponent(accountId)}/movie/rated?page=1&language=en-US&sort_by=created_at.asc`
		);
		const remainingRatedPages = Array.from(
			{ length: Math.max(0, Math.min(firstRatedPage.total_pages ?? 1, 25) - 1) },
			(_, index) => index + 2
		);
		ratedPages = [
			firstRatedPage,
			...await Promise.all(
				remainingRatedPages.map((page) =>
					tmdb(
						fetch,
						`/4/account/${encodeURIComponent(accountId)}/movie/rated?page=${page}&language=en-US&sort_by=created_at.asc`
					)
				)
			)
		];
	}

	const genreNames = Object.fromEntries(
		(genreData.genres ?? []).map((genre) => [genre.id, genre.name])
	);
	const listPages = [firstPage, ...pages];
	const comments = Object.assign(
		{},
		...listPages.map((page) => page.comments ?? {})
	);
	const personalRatings = new Map(
		ratedPages
			.flatMap((page) => page.results ?? [])
			.map((movie) => [movie.id, Number(movie.account_rating?.value ?? 0)])
			.filter(([, rating]) => rating > 0)
	);
	const baseItems = listPages
		.flatMap((page) => page.results ?? [])
		.filter((item) => item.media_type !== 'tv')
		.map((movie) => ({
			id: movie.id,
			title: movie.title ?? movie.original_title ?? 'Untitled',
			releaseDate: movie.release_date ?? '',
			language: movie.original_language ?? '',
			personalRating: personalRatings.get(movie.id) ?? null,
			posterPath: movie.poster_path ?? null,
			runtime: Number(movie.runtime ?? 0),
			watchedDate: watchedDateFromComment(
				comments[`movie:${movie.id}`] ?? movie.comment
			),
			genres: (movie.genre_ids ?? []).map((id) => genreNames[id] ?? `Genre ${id}`),
			url: `https://www.themoviedb.org/movie/${movie.id}`
		}));
	const items = await enrichMovies(fetch, baseItems);

	setHeaders({ 'cache-control': 'public, max-age=300, s-maxage=3600' });

	return {
		list: {
			name: firstPage.name ?? 'My movie list',
			description: firstPage.description ?? '',
			itemCount: items.length
		},
		movies: items
	};
}
