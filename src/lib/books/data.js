export const statusNames = { 1: 'Want to read', 2: 'Currently reading', 3: 'Read', 4: 'Did not finish', 5: 'Paused' };

const positive = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
const safeUrl = value => {
	try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
};

export function normalizeBooks(rows) {
	const books = new Map();
	for (const row of rows) {
		if (row.privacy_setting_id !== 1 || !row.book?.id) continue;
		const book = row.book;
		const authors = [...new Set((book.cached_contributors ?? [])
			.filter(person => person.contributor_role_id === 1 || person.contribution === 'Author' || !person.contributor_role_id)
			.map(person => person.author?.name).filter(Boolean))];
		const finished = (row.user_book_reads ?? []).map(read => read.finished_at).filter(Boolean).sort();
		books.set(book.id, {
			id: book.id, title: book.title || 'Untitled', authors,
			status: Number(row.status_id), rating: positive(row.rating),
			pages: positive(row.edition?.pages) ?? positive(book.pages),
			year: positive(book.release_year), cover: safeUrl(book.cached_image?.url),
			genres: [...new Set((book.cached_tags?.Genre ?? []).map(tag => tag.tag).filter(Boolean))],
			description: String(book.description ?? '').replace(/<[^>]*>/g, '').trim(),
			finishedDate: finished.at(-1) || row.last_read_date || row.first_read_date || null,
			url: `https://hardcover.app/books/${encodeURIComponent(book.slug || String(book.id))}`
		});
	}
	return [...books.values()];
}

export function readingStats(books) {
	const read = books.filter(book => book.status === 3);
	return {
		read: read.length,
		pages: read.reduce((sum, book) => sum + (book.pages || 0), 0),
		authors: new Set(read.flatMap(book => book.authors)).size,
		reading: books.filter(book => book.status === 2).length,
		missingPages: read.filter(book => !book.pages).length
	};
}

export function authorCounts(books) {
	const counts = new Map();
	for (const book of books) for (const name of new Set(book.authors)) counts.set(name, (counts.get(name) ?? 0) + 1);
	return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
