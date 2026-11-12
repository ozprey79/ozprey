import { mkdir, writeFile } from 'node:fs/promises';

const destination = new URL('../src/lib/assets/source-art/cat/', import.meta.url);
await mkdir(destination, { recursive: true });
const n = (value) => Number(value.toFixed(2));

// Shared anatomy, viewBox, and ground line keep all 24 exposures registered.
function leg(hip, phase, rear) {
  const reach = Math.sin(phase);
  const lifted = Math.max(0, Math.cos(phase));
  const x = hip;
  const kneeX = x + reach * (rear ? 23 : 15) + (rear ? -6 : 3);
  const kneeY = 143 - lifted * 11;
  const pawX = x + reach * (rear ? 43 : 38);
  const pawY = 184 - lifted * 34;
  const thigh = rear ? 13 : 8;
  return `<path d="M${x-thigh} 111 C${x-thigh-5} 126 ${n(kneeX-7)} ${n(kneeY-9)} ${n(kneeX-5)} ${n(kneeY)} Q${n(pawX-7)} ${n(pawY-12)} ${n(pawX-7)} ${n(pawY-3)} Q${n(pawX-8)} ${n(pawY+3)} ${n(pawX-2)} ${n(pawY+3)} L${n(pawX+9)} ${n(pawY+3)} Q${n(pawX+15)} ${n(pawY+1)} ${n(pawX+10)} ${n(pawY-3)} L${n(pawX+1)} ${n(pawY-6)} Q${n(kneeX+5)} ${n(kneeY+2)} ${n(kneeX+6)} ${n(kneeY-2)} C${n(kneeX+13)} ${n(kneeY-17)} ${x+thigh+4} 129 ${x+thigh} 111 Z"/>`;
}

for (let i = 0; i < 24; i++) {
  const phase = i / 24 * Math.PI * 2;
  const bob = n(Math.cos(phase * 2) * 2.5);
  const arch = n(80 - Math.cos(phase * 2) * 4);
  const tail = n(Math.sin(phase) * 7);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="225" viewBox="0 0 360 225">
  <title>Cat walking — exposure ${String(i+1).padStart(2,'0')} of 24</title>
  <g fill="#151215" transform="translate(0 ${bob})">
    ${leg(137, phase + Math.PI, true)}
    ${leg(220, phase + .65, false)}
    <path d="M119 103 C99 99 83 ${n(87+tail)} 65 ${n(83+tail)} C48 ${n(79+tail)} 40 ${n(91+tail)} 30 ${n(89+tail)} C22 ${n(87+tail)} 25 ${n(80+tail)} 31 ${n(81+tail)} C41 ${n(83+tail)} 47 ${n(69+tail)} 67 ${n(73+tail)} C90 ${n(76+tail)} 102 88 124 89 Z"/>
    <path d="M112 96 C122 79 145 ${arch} 166 ${n(arch+5)} C192 ${n(arch+11)} 210 82 227 88 C236 91 241 100 238 113 C234 126 223 134 209 132 C187 126 171 128 151 135 C134 143 112 133 108 119 C106 109 107 103 112 96 Z"/>
    ${leg(137, phase, true)}
    ${leg(220, phase + Math.PI + .65, false)}
    <path d="M218 108 C226 100 232 92 235 84 L237 66 Q238 62 241 66 L250 75 Q255 72 260 74 L269 65 Q272 62 272 68 L271 83 Q279 91 281 97 L288 101 Q292 104 287 108 L281 110 Q278 120 268 120 C256 121 250 113 245 112 L231 127 Z"/>
  </g>
</svg>
`;
  await writeFile(new URL(`${String(i+1).padStart(2,'0')}.svg`, destination), svg);
}
console.log('Created 24 cat SVG exposures in src/lib/assets/source-art/cat.');
