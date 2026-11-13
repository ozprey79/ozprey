import songs from '$lib/music_data/musicolet_all_song_stats.csv?raw';
import weeks from '$lib/music_data/musicolet_play_counts_by_week.csv?raw';
import months from '$lib/music_data/musicolet_play_counts_by_month.csv?raw';
import years from '$lib/music_data/musicolet_play_counts_by_year.csv?raw';

function csvRecords(source) {
	const rows = [];
	let row = [];
	let field = '';
	let quoted = false;
	for (let i = 0; i < source.length; i++) {
		const char = source[i];
		if (char === '"') {
			if (quoted && source[i + 1] === '"') {
				field += '"';
				i++;
			} else {
				quoted = !quoted;
			}
		} else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
			row.push(field);
			field = '';
			if (char === ',') continue;
			if (char === '\r' && source[i + 1] === '\n') i++;
			if (row.some(Boolean)) rows.push(row);
			row = [];
		} else {
			field += char;
		}
	}
	if (field || row.length) rows.push([...row, field]);
	const [header, ...records] = rows;
	return records.map((values) =>
		Object.fromEntries(header.map((key, index) => [key.trim(), values[index] ?? '']))
	);
}

const positive = (value) => Math.max(0, Number(value) || 0);
const tag = (value) => /^<unknown>$/i.test(value.trim()) ? '' : value.trim();

function snapshots(source) {
	return csvRecords(source)
		.map(({ year, bucket, plays }) => ({ year, bucket, plays: positive(plays) }))
		.sort((a, b) => Number(a.year) - Number(b.year) || Number(a.bucket) - Number(b.bucket));
}

export const prerender = true;

export function load() {
	const library = csvRecords(songs);
	const tracks = library
		.filter((row) => positive(row.num_played_total) > 0)
		.map((row) => ({
			title: tag(row.title) || 'Untitled track',
			artist: tag(row.artist),
			composer: tag(row.composer ?? ''),
			album: tag(row.album),
			plays: positive(row.num_played_total),
			durationMs: positive(row.duration_ms)
		}));

	return {
		tracks,
		librarySize: library.length,
		periods: { week: snapshots(weeks), month: snapshots(months), year: snapshots(years) }
	};
}
