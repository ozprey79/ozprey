import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { currentArchive, refreshArchive } from '../../filmarchive/archive.server.js';

const credits = new Map();
const pending = new Map();
async function directorsFor(id, fetch) {
	if (credits.has(id)) return credits.get(id);
	if (pending.has(id)) return pending.get(id);
	const request = (async () => {
		try {
			const response = await fetch(`https://api.themoviedb.org/3/movie/${id}/credits`, {
				headers: { Authorization: `Bearer ${env.TMDB_ACCESS_TOKEN}` }, signal: AbortSignal.timeout(12000)
			});
			if (!response.ok) return null;
			const result = await response.json();
			const names = [...new Set((result.crew ?? []).filter(person => person.job === 'Director').map(person => person.name))];
			credits.set(id, names);
			return names;
		} catch { return null; } finally { pending.delete(id); }
	})();
	pending.set(id, request);
	return request;
}
export async function GET({ url, fetch }) {
	if (!url.searchParams.has('offset')) {
		const result = await refreshArchive();
		const names = new Intl.DisplayNames(['en'], { type: 'language' });
		return json({ stale: result.stale, movies: result.archive.items.filter(item => item.type === 'movie').map(item => ({
			id: Number(item.key.split('/')[1]), title: item.title, releaseDate: item.year ? `${item.year}-01-01` : '',
			genres: item.genres, language: item.language ? names.of(item.language) : '',
			url: `https://www.themoviedb.org/${item.key}`, directors: credits.get(Number(item.key.split('/')[1])) ?? []
		})) });
	}
	const offset = Number(url.searchParams.get('offset'));
	if (!Number.isInteger(offset) || offset < 0) throw error(400, 'Invalid offset');
	const items = currentArchive().archive.items.filter(item => item.type === 'movie');
	const batch = items.slice(offset, offset + 80);
	const results = [];
	for (let i = 0; i < batch.length; i += 8) {
		results.push(...await Promise.all(batch.slice(i, i + 8).map(async item => {
			const id = Number(item.key.split('/')[1]);
			return { id, directors: await directorsFor(id, fetch) };
		})));
	}
	return json({ credits: results, next: offset + batch.length < items.length ? offset + batch.length : null }, { headers: { 'cache-control': 'no-store' } });
}
