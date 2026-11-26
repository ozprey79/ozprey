export function releaseYear(value) {
	const year = Number(value);
	return Number.isInteger(year) && year >= 1000 && year <= 9999 ? year : null;
}

export function trackValue(track, metric) {
	if (metric === 'tracks') return 1;
	if (metric === 'time') return track.plays * track.durationMs;
	return track.plays;
}

export function releaseBins(tracks, { level = 'decades', decade = null, metric = 'plays' } = {}) {
	const totals = new Map();
	for (const track of tracks) {
		const year = releaseYear(track.year);
		if (year === null || (decade !== null && (year < decade || year >= decade + 10))) continue;
		const bin = level === 'decades' ? Math.floor(year / 10) * 10 : year;
		totals.set(bin, (totals.get(bin) ?? 0) + trackValue(track, metric));
	}
	if (level === 'decades') return [...totals].sort((a, b) => a[0] - b[0]);
	if (!totals.size && decade === null) return [];
	const first = decade ?? Math.min(...totals.keys());
	const last = decade === null ? Math.max(...totals.keys()) : decade + 9;
	return Array.from({ length: last - first + 1 }, (_, index) => [first + index, totals.get(first + index) ?? 0]);
}

export function topTen(tracks, group = 'composer', metric = 'plays') {
	const totals = new Map();
	for (const track of tracks) {
		const name = group === 'track' ? [track.title, track.artist].filter(Boolean).join(' · ') : track[group] || `Unknown ${group}`;
		totals.set(name, (totals.get(name) ?? 0) + trackValue(track, metric));
	}
	return [...totals].filter(([, value]) => value > 0)
		.sort(([nameA, a], [nameB, b]) => b - a || nameA.localeCompare(nameB))
		.slice(0, 10);
}
