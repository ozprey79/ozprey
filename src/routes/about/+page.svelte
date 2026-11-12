<script>
  import FisheyeSurface from '$lib/about/FisheyeSurface.svelte';
  import DrawnStroke from '$lib/about/DrawnStroke.svelte';
  let strokeActive = $state(false);
</script>

<svelte:head>
  <title>ABout me — Ozprey</title>
  <meta name="description" content="The person behind Ozprey. A little about design, letters, motion, and the things I keep coming back to." />
</svelte:head>

<main>
  <FisheyeSurface ontransitionstart={() => strokeActive = false} ontransitionend={() => strokeActive = true}>
    <section class="hero" aria-labelledby="about-title">
      <div class="eyebrow"><p data-lens-text>OZPREY / PERSONAL NOTES</p><p data-lens-text>01 — THE PERSON</p></div>
      <div class="title-block">
        <p class="preface" data-lens-text>A little out of the ordinary.</p>
        <div class="title-line">
          <h1 id="about-title" data-lens-text>ABout me</h1>
          <div class="handstroke"><DrawnStroke active={strokeActive} /></div>
        </div>
        <div class="rule" data-lens-rule></div>
        <div class="intro">
          <p class="identity" data-lens-text>Designer.<br />Calligrapher.<br />Archivist.</p>
          <p class="statement" data-lens-text>I like letters with character,<br class="desktop-break" /> images that linger, and<br class="desktop-break" /> things that move you.</p>
        </div>
      </div>
      <a class="scroll-note" href="#personal-notes" data-lens-text>A FEW MORE THINGS ↓</a>
    </section>
  </FisheyeSurface>

  <section class="notes" id="personal-notes" aria-labelledby="notes-title">
    <div class="section-label"><span>02 / A CLOSER LOOK</span><h2 id="notes-title">Always looking.<br /><em>Always collecting.</em></h2></div>
    <div class="note-copy">
      <p>This is my corner of the internet: a place for design, experiments, and the things that hold my attention.</p>
      <p>Typography, calligraphy, and motion sit alongside films, music, and an ever-growing archive of references. Sometimes they become something. Sometimes I just keep looking.</p>
      <a href="/blog">Notes from the process <span aria-hidden="true">↗</span></a>
    </div>
  </section>

  <nav class="interests" aria-label="Explore my interests">
    <a href="/movies"><span class="index">01</span><span class="interest-title">What I watch</span><span class="detail">The film archive</span><span aria-hidden="true">↗</span></a>
    <a href="/music"><span class="index">02</span><span class="interest-title">What I hear</span><span class="detail">The listening room</span><span aria-hidden="true">↗</span></a>
    <a href="/blog"><span class="index">03</span><span class="interest-title">What I think</span><span class="detail">Notes & observations</span><span aria-hidden="true">↗</span></a>
  </nav>

  <footer><span>OZPREY / A WORK IN PROGRESS</span><a href="/">Back to the beginning ↑</a></footer>
</main>

<style>
  main { --muted: #bc94ae; --lens-ink: var(--fill); --lens-rule-ink: #614454; font-family: 'Instrument Serif', sans-serif; }
  .hero { min-height: max(740px, 100svh); padding: 126px 5vw 90px; display: flex; flex-direction: column; justify-content: space-between; }
  .eyebrow, .intro { display: flex; justify-content: space-between; gap: 32px; }
  .eyebrow, .scroll-note, .section-label > span, footer, .index, .detail { font-size: 10px; letter-spacing: .09em; line-height: 1.6; }
  .eyebrow { --lens-ink: var(--muted); color: var(--muted); }
  .title-block { padding: 45px 0 42px; }
  .preface { font: 400 clamp(20px, 2.3vw, 34px)/1.5 'Instrument Serif', serif; }
  h1 { font: 400 clamp(96px, 20.6vw, 360px)/.98 var(--mfont); letter-spacing: -.025em; white-space: nowrap; margin: 14px 0 25px; }
  .title-line { position: relative; display: flow-root; }
  .handstroke { position: absolute; right: 0; top: 50%; width: 24%; max-width: 320px; transform: translateY(-50%); color: var(--fill); pointer-events: none; }
  .rule { height: 1px; background: #614454; margin-bottom: 30px; }
  .identity { font: 400 clamp(23px, 3vw, 46px)/1.15 var(--mfont); }
  .statement { width: 47%; font: 400 clamp(23px, 3.2vw, 49px)/1.18 'Instrument Serif', serif; }
  .scroll-note { align-self: flex-start; text-underline-offset: 5px; }
  .scroll-note:hover { text-decoration: underline; }
  .notes { padding: 110px 5vw 100px; display: grid; grid-template-columns: 1fr 1fr; gap: 6vw; border-top: 1px solid #614454; scroll-margin-top: 30px; }
  .section-label > span { color: var(--muted); }
  h2 { margin-top: 30px; font: 400 clamp(35px, 4.5vw, 68px)/1.1 var(--mfont); }
  h2 em { font-family: 'Instrument Serif', serif; font-weight: 400; }
  .note-copy { max-width: 530px; padding-top: 45px; }
  .note-copy p { font: 400 clamp(19px, 2vw, 27px)/1.5 'Instrument Serif', serif; margin-bottom: 24px; }
  .note-copy a { display: inline-block; margin-top: 14px; font-size: 12px; border-bottom: 1px solid #bc94ae; padding-bottom: 8px; }
  .note-copy a span { margin-left: 24px; }
  .interests { margin: 0 5vw; }
  .interests a { display: grid; grid-template-columns: 55px 1fr 190px 30px; align-items: center; gap: 12px; padding: 28px 0; border-top: 1px solid #614454; transition: color 180ms, padding 180ms; }
  .interests a:last-child { border-bottom: 1px solid #614454; }
  .interests a:hover { color: #fff; padding-left: 12px; }
  .index, .detail { color: var(--muted); }
  .interest-title { font: 400 clamp(30px, 4.5vw, 64px)/1.1 var(--mfont); }
  .interests a > span:last-child { font-size: 25px; }
  footer { padding: 50px 5vw 35px; display: flex; justify-content: space-between; gap: 25px; color: var(--muted); }
  a:focus-visible { outline: 2px solid var(--fill); outline-offset: 7px; }
  @media (min-width: 1800px) { .hero { padding-top: 155px; } }
  @media (max-width: 600px) {
    .hero { min-height: max(690px, 100svh); padding-top: 105px; }
    .eyebrow { gap: 12px; font-size: 8px; }
    .title-block { padding: 40px 0; }
    h1 { font-size: 20.5vw; margin-top: 20px; margin-bottom: 25px; }
    .intro { flex-direction: column; gap: 30px; }
    .identity { font-size: 26px; }
    .statement { width: 100%; max-width: 340px; font-size: 29px; }
    .desktop-break { display: none; }
    .notes { grid-template-columns: 1fr; padding-top: 65px; padding-bottom: 60px; gap: 10px; }
    .note-copy { padding-top: 20px; }
    .interests a { grid-template-columns: 30px 1fr 25px; padding: 24px 0; }
    .detail { display: none; }
    footer { flex-direction: column; font-size: 9px; }
  }
  @media (prefers-reduced-motion: reduce) { .interests a { transition: none; } }
</style>
