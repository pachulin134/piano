// Piezas ORIGINALES compuestas por Claude para la sección "Creadas para ti".
// Composición como datos → MIDI, mismo patrón que makeSongs.mjs.
import pkg from '@tonejs/midi';
const { Midi } = pkg;
import { mkdirSync, writeFileSync } from 'node:fs';

const BPM = 76;
const SPB = 60 / BPM; // segundos por beat (negra)

// ---------- "Cielo Abierto" — La menor, 4/4, forma Intro–A–A'–B–A''–Coda ----------

// Acordes para la mano izquierda: [raíz2, quinta, octava] (patrón de arpegio r-5-8-5 en corcheas)
const CHORDS = {
  Am: [45, 52, 57], F: [41, 48, 53], C: [48, 55, 60],
  G: [43, 50, 55], Dm: [50, 57, 62], Em: [40, 47, 52],
};

// Progresiones por sección (un acorde por compás)
const INTRO = ['Am', 'F', 'C', 'G'];
const VERSE = ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'];
const BRIDGE = ['Dm', 'Am', 'F', 'G', 'Dm', 'Am', 'F', 'G'];
const CODA = ['Am', 'F', 'C', 'Am'];

// Melodías: [midi, beats] por compás (4 beats); null = silencio
const REST = (b) => [null, b];
const MEL_A = [
  [[64, 1], [69, 1], [71, 2]],           // Am: mi la si—
  [[72, 2], [71, 1], [69, 1]],           // F:  do' si la
  [[67, 2], [64, 1], [67, 1]],           // C:  sol mi sol
  [[69, 2], [71, 2]],                    // G:  la si—
  [[72, 1], [71, 1], [69, 2]],           // Am: do' si la—
  [[69, 1], [67, 1], [65, 2]],           // F:  la sol fa—
  [[64, 2], [67, 1], [64, 1]],           // C:  mi— sol mi
  [[62, 3], REST(1)],                    // G:  re——— (respira)
];
const MEL_A2 = [                          // A': igual pero cierra subiendo
  ...MEL_A.slice(0, 7),
  [[71, 2], [72, 2]],                    // G:  si do' → empuja al puente
];
const MEL_B = [
  [[65, 1], [69, 1], [74, 2]],           // Dm: fa la re'—
  [[72, 1], [71, 1], [69, 2]],           // Am: do' si la—
  [[69, 1], [72, 1], [77, 2]],           // F:  la do' fa'—
  [[76, 2], [74, 2]],                    // G:  mi' re'—
  [[74, 1], [76, 1], [77, 2]],           // Dm: re' mi' fa'—
  [[76, 2], [72, 2]],                    // Am: mi'— do'—
  [[69, 1], [72, 1], [69, 2]],           // F:  la do' la—
  [[71, 2], [74, 2]],                    // G:  si re' → vuelta al tema
];
const MEL_A3 = [                          // A'': primera mitad una octava arriba (clímax), luego baja
  [[76, 1], [81, 1], [83, 2]],           // Am: mi' la' si'—
  [[84, 2], [83, 1], [81, 1]],           // F:  do'' si' la'
  [[79, 2], [76, 1], [79, 1]],           // C:  sol' mi' sol'
  [[81, 2], [83, 2]],                    // G:  la' si'—
  [[72, 1], [71, 1], [69, 2]],           // Am: baja a la octava media
  [[69, 1], [67, 1], [65, 2]],           // F
  [[64, 2], [67, 1], [64, 1]],           // C
  [[69, 4]],                             // G:  la———— (larga, resuelve)
];
const MEL_CODA = [
  [[64, 2], [60, 2]],                    // Am: mi— do—
  [[65, 2], [64, 2]],                    // F:  fa— mi—
  [[62, 2], [64, 2]],                    // C:  re— mi—
  [[69, 4]],                             // Am: la———— final
];

function addLeftBar(track, chordName, tStart, pattern = 'flow') {
  const [r, q, o] = CHORDS[chordName];
  if (pattern === 'calm') { // coda: blancas
    track.addNote({ midi: r, time: tStart, duration: 2 * SPB * 0.95 });
    track.addNote({ midi: q, time: tStart + 2 * SPB, duration: 2 * SPB * 0.95 });
    return;
  }
  const seq = [r, q, o, q, r, q, o, q]; // corcheas r-5-8-5 ×2
  seq.forEach((m, i) => track.addNote({ midi: m, time: tStart + i * 0.5 * SPB, duration: 0.5 * SPB * 0.95 }));
}

function addMelodyBar(track, bar, tStart) {
  let t = tStart;
  for (const [midi, beats] of bar) {
    if (midi !== null) track.addNote({ midi, time: t, duration: beats * SPB * 0.92 });
    t += beats * SPB;
  }
}

function buildCieloAbierto() {
  const midi = new Midi();
  midi.header.setTempo(BPM);
  const right = midi.addTrack(); right.name = 'right';
  const left = midi.addTrack(); left.name = 'left';

  let bar = 0;
  const barLen = 4 * SPB;
  const put = (chords, melody, pattern = 'flow') => {
    chords.forEach((ch, i) => {
      addLeftBar(left, ch, (bar + i) * barLen, pattern);
      if (melody) addMelodyBar(right, melody[i], (bar + i) * barLen);
    });
    bar += chords.length;
  };

  put(INTRO, null);                 // 4 compases solo MI
  put(VERSE, MEL_A);                // A
  put(VERSE, MEL_A2);               // A'
  put(BRIDGE, MEL_B);               // B (clímax suave)
  put(VERSE, MEL_A3);               // A'' (octava arriba y desciende)
  put(CODA, MEL_CODA, 'calm');      // coda en calma

  // acorde final: La menor abierto, largo
  const tEnd = bar * barLen;
  left.addNote({ midi: 45, time: tEnd, duration: 4 * SPB });
  left.addNote({ midi: 52, time: tEnd, duration: 4 * SPB });
  right.addNote({ midi: 57, time: tEnd, duration: 4 * SPB });
  right.addNote({ midi: 64, time: tEnd, duration: 4 * SPB });
  right.addNote({ midi: 69, time: tEnd, duration: 4 * SPB });

  return midi;
}

const SONGS = [
  { file: 'cielo-abierto.mid', title: 'Cielo Abierto — por Claude ✨', build: buildCieloAbierto },
];

mkdirSync('public/songs/claude', { recursive: true });
for (const s of SONGS) {
  writeFileSync(`public/songs/claude/${s.file}`, Buffer.from(s.build().toArray()));
}
writeFileSync('public/songs/claude/index.json',
  JSON.stringify(SONGS.map(s => ({ file: s.file, title: s.title })), null, 2));
console.log(`Compuestas ${SONGS.length} piezas en public/songs/claude/`);
