<script>
	import MinimalSelect from '../movies/MinimalSelect.svelte';
	import { reveal, drawRules } from '../movies/reveal.js';
	import { releaseBins, topTen, trackValue } from '$lib/music_data/chartData.js';
	let { data } = $props();
	let chartMode = $state('decades');
	let decade = $state(null);
	let selectedYear = $state(null);
	let group = $state('composer');
	let metric = $state('plays');
	const groups = { composer: 'Composers', artist: 'Artists', album: 'Albums', track: 'Tracks' };
	const number = new Intl.NumberFormat('en-IN');
	const count = value => number.format(Math.round(value));
	function duration(ms) {
		const minutes = Math.round(ms / 60000);
		if (ms > 0 && !minutes) return '<1m';
		const hours = Math.floor(minutes / 60);
		return hours ? `${count(hours)}h ${minutes % 60}m` : `${minutes}m`;
	}
	const format = $derived(metric === 'time' ? duration : count);
	const unit = $derived(metric === 'time' ? 'estimated listening time' : metric);
	const level = $derived(chartMode === 'years' || decade !== null ? 'years' : 'decades');
	const bins = $derived(releaseBins(data.tracks, { level, decade, metric }));
	const peak = $derived(Math.max(1, ...bins.map(([, value]) => value)));
	const missingYears = $derived(data.tracks.filter(track => track.year === null).length);
	const scopedTracks = $derived(data.tracks.filter(track =>
		(selectedYear !== null ? track.year === selectedYear : decade !== null ? track.year !== null && track.year >= decade && track.year < decade + 10 : true)));
	const rankings = $derived(topTen(scopedTracks, group, metric));
	const rankingPeak = $derived(Math.max(1, ...rankings.map(([, value]) => value)));
	const scope = $derived(selectedYear !== null ? String(selectedYear) : decade !== null ? `${decade}s` : 'All releases');
	const total = $derived(scopedTracks.reduce((sum, track) => sum + trackValue(track, metric), 0));
	const missingDuration = $derived(scopedTracks.filter(track => !track.durationMs).reduce((sum, track) => sum + track.plays, 0));
	function selectBin(year) {
		if (level === 'decades') { decade = year; selectedYear = null; }
		else selectedYear = selectedYear === year ? null : year;
	}
	function resetYears() { decade = null; selectedYear = null; }
</script>

<div class="movie-panel musicolet-panel" aria-label="Release years and top ten music">
	<section class="release-section" aria-labelledby="music-years-heading">
		<header class="heading" use:drawRules>
			<h2 id="music-years-heading" use:reveal>{decade !== null ? `${decade}s by year` : level === 'decades' ? 'Release decades' : 'Release years'}</h2>
			<MinimalSelect label="Music release chart view" bind:value={chartMode} onchange={resetYears}><option value="decades">Decades</option><option value="years">Years</option></MinimalSelect>
		</header>
		<div class="chart-controls">
			{#if decade !== null || selectedYear !== null}<button class="back" onclick={resetYears}>{chartMode === 'decades' ? 'All decades' : 'All years'}</button>{/if}
			<label>Measure <MinimalSelect label="Music chart measure" bind:value={metric}><option value="plays">Plays</option><option value="tracks">Tracks</option><option value="time">Estimated time</option></MinimalSelect></label>
		</div>
		<p class="chart-caption">{level === 'decades' ? 'Select a decade to explore its years.' : 'Select a year to explore its top 10.'}</p>
		{#if bins.length}
			<div class="decades" style:--columns={bins.length} style:--column-width={metric === 'time' ? '80px' : '48px'} role="group" aria-label={`Music by release ${level}`}>
				{#each bins as [year, value] (year)}
					<button class="column" class:muted={selectedYear !== null && selectedYear !== year} class:selected={selectedYear === year}
						aria-pressed={selectedYear === year} aria-label={`${year}${level === 'decades' ? 's' : ''}: ${format(value)} ${unit}`} onclick={() => selectBin(year)}>
						<span class="plot"><span class="stem" class:empty={value === 0} style:height={`${100 * value / peak}%`}>
							{#if value > 0}<svg class="bar-fill" width="100%" height="100%" aria-hidden="true"><rect width="50%" height="100%" fill="currentColor" /></svg>{/if}
							<span class="value">{format(value)}</span>
						</span></span>
						<span class="tick">{year}{level === 'decades' ? 's' : ''}</span>
					</button>
				{/each}
			</div>
		{:else}<p class="empty">No release years recorded in this library.</p>{/if}
		<footer class="chart-note">Musicolet · song release years.{#if missingYears} {count(missingYears)} tracks have no year tag; they remain in the overall top 10.{/if}</footer>
	</section>

	<section class="ranking-section" aria-labelledby="music-top-heading">
		<header class="heading" use:drawRules>
			<h2 id="music-top-heading" use:reveal>Top 10</h2>
			<MinimalSelect label="Group music top ten" bind:value={group}>{#each Object.entries(groups) as [value, name]}<option {value}>{name}</option>{/each}</MinimalSelect>
		</header>
		<div class="ranking-summary" aria-live="polite"><span>{scope}</span><span>{format(total)} {metric === 'time' ? 'listened' : unit}</span></div>
		<ol class="ranking-list" aria-live="polite" aria-label={`Top ten ${groups[group].toLowerCase()} by ${unit}`}>
			{#each rankings as [name, value], index (name)}
				<li>
					<span class="rank">{String(index + 1).padStart(2, '0')}</span>
					<span class="rank-content"><span class="name" title={name}>{name}</span><span class="rank-rail" aria-hidden="true"><span style:width={`${100 * value / rankingPeak}%`}></span></span></span>
					<span class="rank-value">{format(value)}</span>
				</li>
			{:else}<li class="empty">No {groups[group].toLowerCase()} for this selection.</li>{/each}
		</ol>
		<footer class="chart-note">{count(scopedTracks.length)} tracks · ranked by {unit}.{#if metric === 'time'} Full track length × counted plays.{#if missingDuration} {count(missingDuration)} plays have no recorded track length.{/if}{/if}</footer>
	</section>
</div>

<style>
	.musicolet-panel { display:grid; grid-template-columns:minmax(0,1.1fr) minmax(0,1fr); gap:clamp(24px,4vw,64px); margin-top:80px; }
	section { min-width:0; }
	.heading { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; padding-bottom:14px; border-bottom:1px solid currentColor; }
	h2 { margin:0; font:400 clamp(2rem,3.2vw,3.4rem)/1 var(--mfont); }
	.heading :global(.minimal-select) { font-size:.9rem; }
	button { color:inherit; background:transparent; font:inherit; margin:0; border-radius:0; cursor:pointer; }
	button:focus-visible { outline:2px solid var(--heart); outline-offset:3px; }
	.chart-controls { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px 16px; margin-top:8px; min-height:44px; font-size:.9rem; }
	label { display:flex; align-items:center; gap:8px; }
	.back { padding:8px 0; color:var(--heart); text-decoration:underline; text-underline-offset:4px; }
	.chart-caption, .chart-note { font-size:.875rem; line-height:1.5; opacity:.65; }
	.chart-caption { margin-top:4px; }
	.decades { display:grid; grid-template-columns:repeat(var(--columns),minmax(var(--column-width),1fr)); overflow-x:auto; padding:24px 3px 4px; }
	.column { min-width:0; padding:0; border:0; }
	.column.muted { opacity:.35; }
	.column.selected { color:var(--heart); }
	.plot { display:flex; align-items:end; justify-content:center; height:300px; padding-top:32px; border-bottom:1px solid color-mix(in srgb,currentColor 30%,transparent); }
	.stem { position:relative; display:block; width:14px; min-height:3px; border:1px solid currentColor; border-radius:8px 8px 0 0; }
	.stem.empty { min-height:0; border:0; }
	.bar-fill { display:block; border-radius:inherit; overflow:hidden; }
	.value { position:absolute; bottom:calc(100% + 7px); left:50%; transform:translateX(-50%); font-size:.9rem; white-space:nowrap; font-variant-numeric:tabular-nums; }
	.tick { display:block; padding-top:12px; font-size:.875rem; }
	.chart-note { margin-top:16px; }
	.ranking-summary { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; min-height:44px; padding-block:12px; font-size:.9rem; }
	.ranking-summary > span:first-child { color:var(--heart); }
	.ranking-summary > span:last-child { opacity:.65; }
	.ranking-list { list-style:none; padding:0; margin:0; }
	.ranking-list li { display:grid; grid-template-columns:2ch minmax(0,1fr) auto; align-items:center; gap:14px; min-height:44px; padding:10px 0; border-bottom:1px solid color-mix(in srgb,currentColor 18%,transparent); }
	.rank { color:var(--heart); font-size:.875rem; font-variant-numeric:tabular-nums; }
	.rank-content { min-width:0; }
	.name { display:block; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:1rem; }
	.rank-rail { display:block; height:2px; margin-top:6px; background:color-mix(in srgb,currentColor 10%,transparent); }
	.rank-rail > span { display:block; height:100%; background:currentColor; opacity:.55; }
	.ranking-list li:first-child .rank-rail > span { background:var(--heart); opacity:1; }
	.rank-value { font-size:1rem; font-variant-numeric:tabular-nums; white-space:nowrap; }
	.empty { margin:24px 0; font-size:1rem; opacity:.65; }
	.ranking-list li.empty { display:block; }
	@media(max-width:800px) and (orientation:portrait) { .musicolet-panel { grid-template-columns:1fr; gap:56px; } .plot { height:250px; } }
	@media(orientation:landscape) {
		.release-section, .ranking-section { display:flex; flex-direction:column; min-height:0; }
		h2 { font-size:clamp(24px,5svh,48px); }
		.heading { flex:none; padding-bottom:10px; }
		.chart-controls, .chart-caption, .ranking-summary, .chart-note { flex:none; }
		.decades { flex:1; min-height:0; }
		.column { display:flex; flex-direction:column; min-height:0; }
		.plot { flex:1; width:100%; height:auto; min-height:0; }
		.ranking-list { flex:1; min-height:0; overflow-y:auto; display:grid; grid-template-rows:repeat(10,minmax(44px,1fr)); }
		.ranking-list li { padding-block:6px; }
		.chart-note { margin-top:12px; }
	}
</style>
