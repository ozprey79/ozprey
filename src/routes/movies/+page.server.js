import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const API = 'https://api.themoviedb.org';

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

export async function load({ fetch, setHeaders }) {
	if (!env.TMDB_ACCESS_TOKEN || !env.TMDB_LIST_ID) {
		throw error(500, 'TMDB_ACCESS_TOKEN and TMDB_LIST_ID must be set');
	}

	const [firstPage, genreData] = await Promise.all([
		tmdb(fetch, `/4/list/${encodeURIComponent(env.TMDB_LIST_ID)}?page=1&language=en-US`),
		tmdb(fetch, '/3/genre/movie/list?language=en-US')
	]);

	const remainingPages = Array.from(
		{ length: Math.max(0, Math.min(firstPage.total_pages ?? 1, 25) - 1) },
		(_, index) => index + 2
	);
	const pages = await Promise.all(
		remainingPages.map((page) =>
			tmdb(fetch, `/4/list/${encodeURIComponent(env.TMDB_LIST_ID)}?page=${page}&language=en-US`)
		)
	);

	const genreNames = Object.fromEntries(
		(genreData.genres ?? []).map((genre) => [genre.id, genre.name])
	);
	const items = [firstPage, ...pages]
		.flatMap((page) => page.results ?? [])
		.filter((item) => item.media_type !== 'tv')
		.map((movie) => ({
			id: movie.id,
			title: movie.title ?? movie.original_title ?? 'Untitled',
			releaseDate: movie.release_date ?? '',
			rating: Number(movie.vote_average ?? 0),
			voteCount: Number(movie.vote_count ?? 0),
			posterPath: movie.poster_path ?? null,
			genres: (movie.genre_ids ?? []).map((id) => genreNames[id] ?? `Genre ${id}`),
			url: `https://www.themoviedb.org/movie/${movie.id}`
		}));

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
