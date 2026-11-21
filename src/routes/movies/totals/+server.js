import { json, error } from '@sveltejs/kit';
import { refreshArchive, currentArchive } from '../../filmarchive/archive.server.js';
import { runtimeTotals } from '../watchTotals.server.js';

export async function GET({ url, fetch }) {
	if (!url.searchParams.has('offset')) {
		const { archive, stale } = await refreshArchive();
		return json({
			movies: archive.items.filter(item => item.type === 'movie').length,
			series: archive.items.filter(item => item.type === 'tv').length,
			total: archive.items.length, stale
		}, { headers: { 'cache-control': 'no-store' } });
	}
	const offset = Number(url.searchParams.get('offset'));
	if (!Number.isInteger(offset) || offset < 0) throw error(400, 'Invalid offset');
	const items = currentArchive().archive.items;
	const batch = items.slice(offset, offset + 40);
	return json({
		...await runtimeTotals(batch, fetch), processed: batch.length,
		next: offset + batch.length < items.length ? offset + batch.length : null
	}, { headers: { 'cache-control': 'no-store' } });
}
