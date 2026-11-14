import { json } from '@sveltejs/kit';
import { refreshArchive } from '../archive.server.js';

export async function GET() {
	const result = await refreshArchive();
	return json(result, {
		headers: { 'cache-control': result.stale ? 'no-store' : 'public, max-age=60, s-maxage=120' }
	});
}
