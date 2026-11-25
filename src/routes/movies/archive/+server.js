import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { currentArchive, refreshArchive } from '../../filmarchive/archive.server.js';
import { productionCountries } from '../movieCountries.js';

const credits = new Map();
const pending = new Map();
async function metadataFor(id, fetch) {
	if (credits.has(id)) return credits.get(id);
	if (pending.has(id)) return pending.get(id);
	const request = (async () => {
		try {
			const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=en-US&append_to_response=credits`, {
				headers: { Authorization: `Bearer ${env.TMDB_ACCESS_TOKEN}` }, signal: AbortSignal.timeout(12000)
			});
			if (!response.ok) return null;
			const result = await response.json();
			const metadata = {
				directors: [...new Set((result.credits?.crew ?? []).filter(person => person.job === 'Director').map(person => person.name))],
				productionCountries: productionCountries(result),
				posterPath: result.poster_path ?? null,
				runtime: Number(result.runtime) || 0
			};
			credits.set(id, metadata);
			return metadata;
		} catch { return null; } finally { pending.delete(id); }
	})();
	pending.set(id, request);
	return request;
}
export async function GET({ url, fetch }) {
	if (url.searchParams.has('id')) {
		const value = url.searchParams.get('id');
		const id = Number(value);
		if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id <= 0) throw error(400, 'Invalid movie ID');
		const metadata = await metadataFor(id, fetch);
		if (!metadata) throw error(502, 'Movie preview could not be loaded');
		return json(metadata, { headers: { 'cache-control': 'public, max-age=3600' } });
	}
	if (!url.searchParams.has('offset')) {
		const result = await refreshArchive();
		const names = new Intl.DisplayNames(['en'], { type: 'language' });
		return json({ stale: result.stale, movies: result.archive.items.filter(item => item.type === 'movie').map(item => ({
			id: Number(item.key.split('/')[1]), title: item.title, releaseDate: item.year ? `${item.year}-01-01` : '',
			genres: item.genres, language: item.language ? names.of(item.language) : '',
			url: `https://www.themoviedb.org/${item.key}`,
			posterPath: credits.get(Number(item.key.split('/')[1]))?.posterPath ?? null,
			runtime: credits.get(Number(item.key.split('/')[1]))?.runtime ?? 0,
			directors: credits.get(Number(item.key.split('/')[1]))?.directors ?? [],
			productionCountries: credits.get(Number(item.key.split('/')[1]))?.productionCountries ?? null
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
			const metadata = await metadataFor(id, fetch);
			return { id, directors: metadata?.directors ?? null, productionCountries: metadata?.productionCountries ?? null };
		})));
	}
	return json({ credits: results, next: offset + batch.length < items.length ? offset + batch.length : null }, { headers: { 'cache-control': 'no-store' } });
}
