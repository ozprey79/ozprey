import { env } from '$env/dynamic/private';
import snapshot from './archive.json';

const listId = '8715680';
export const source = `https://www.themoviedb.org/list/${listId}`;
const refreshInterval = 5 * 60_000;
let cached;
let loading;
let attemptedAt = 0;

async function readArchive(fetch, token) {
	const get = async (path) => {
		const options = { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } };
		const url = 'https://api.themoviedb.org' + path;
		const attempt = () => fetch(url, { ...options, signal: AbortSignal.timeout(12_000) });
		let response = await attempt().catch(() => attempt());
		if (response.status >= 500) response = await attempt();
		if (!response.ok) throw new Error(`TMDB returned ${response.status}`);
		return response.json();
	};
	const readPage = (page) => get(`/4/list/${listId}?language=en-US&page=${page}`);
	const [first, movieGenres, tvGenres] = await Promise.all([
		readPage(1), get('/3/genre/movie/list?language=en-US'), get('/3/genre/tv/list?language=en-US')
	]);
	const pages = [first];
	for (let start = 2; start <= first.total_pages; start += 10) {
		const count = Math.min(10, first.total_pages - start + 1);
		pages.push(...await Promise.all(Array.from({ length: count }, (_, i) => readPage(start + i))));
	}

	const genres = Object.fromEntries([...movieGenres.genres, ...tvGenres.genres]
		.map(({ id, name }) => [id, name]));
	const items = new Map();
	for (const page of pages) {
		for (const entry of page.results) {
			const type = entry.media_type;
			if (type !== 'movie' && type !== 'tv') continue;
			const key = `${type}/${entry.id}`;
			const date = type === 'movie' ? entry.release_date : entry.first_air_date;
			items.set(key, {
				key, type, title: entry.title || entry.name || 'Untitled',
				year: Number(date?.slice(0, 4)) || null,
				language: entry.original_language || '',
				genres: (entry.genre_ids ?? []).map((id) => genres[id]).filter(Boolean)
			});
		}
	}
	if (items.size !== first.total_results) throw new Error('TMDB list changed during refresh');
	return { items: [...items.values()], updatedAt: Date.now() };
}

export function currentArchive() {
	return { archive: cached ?? snapshot, stale: !cached || Date.now() - cached.updatedAt >= refreshInterval };
}

export async function refreshArchive() {
	const token = env.TMDB_ACCESS_TOKEN?.trim();
	if (token && !loading && Date.now() - attemptedAt >= refreshInterval) {
		attemptedAt = Date.now();
		loading = readArchive(globalThis.fetch, token)
			.then((archive) => { cached = archive; })
			.catch((error) => console.warn('[filmarchive]', error.cause?.code ?? error.message))
			.finally(() => { loading = null; });
	}
	await loading;
	return currentArchive();
}
