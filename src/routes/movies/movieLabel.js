export function movieLabel(movie) {
 return {
  title: movie?.title || 'Untitled',
  year: movie?.releaseDate?.slice(0,4) || 'Unknown',
  runtime: movie?.runtime > 0 ? `${movie.runtime} MIN` : 'UNKNOWN',
  director: movie?.director || 'Unavailable',
  inventory: String(movie?.id ?? '').padStart(10,'0'),
  artwork: [movie?.backdropPath,movie?.posterPath].filter(Boolean).map(path=>`https://image.tmdb.org/t/p/original${path}`)
 };
}
