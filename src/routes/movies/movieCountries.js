// Country codes come from TMDB production_countries, never from a film's language.
export function productionCountries(details) {
	if (!details) return null;
	return [...new Map((details.production_countries ?? [])
		.filter(country => /^[A-Z]{2}$/.test(country.iso_3166_1))
		.map(country => [country.iso_3166_1, { code: country.iso_3166_1, name: country.name || country.iso_3166_1 }])).values()];
}

export function countryCounts(movies) {
	const counts = new Map();
	const seen = new Set();
	for (const movie of movies) {
		if (seen.has(movie.id)) continue;
		seen.add(movie.id);
		for (const country of new Map((movie.productionCountries ?? []).map(country => [country.code, country])).values()) {
			const entry = counts.get(country.code) ?? { ...country, count: 0 };
			entry.count += 1;
			counts.set(country.code, entry);
		}
	}
	return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function hasCountry(movie, code) {
	return !code || (movie.productionCountries ?? []).some(country => country.code === code);
}
