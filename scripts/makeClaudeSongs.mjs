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

// ---------- "Terciopelo" — R&B lento en Do, acordes de séptima y melodía sincopada ----------

function buildTerciopelo() {
  const BPM_RNB = 70;
  const spb = 60 / BPM_RNB;
  const midi = new Midi();
  midi.header.setTempo(BPM_RNB);
  const right = midi.addTrack(); right.name = 'right';
  const left = midi.addTrack(); left.name = 'left';

  // Acordes de séptima: [raíz, quinta, séptima]
  const CH = {
    Cmaj7: [48, 55, 59], Am7: [45, 52, 55], Dm7: [50, 57, 60],
    G7: [43, 50, 53], Fmaj7: [41, 48, 52], Em7: [40, 47, 50],
  };
  // MI estilo balada R&B: raíz larga, luego 5ª y 7ª (deja respirar)
  const leftBar = (name, t) => {
    const [r, q, s] = CH[name];
    left.addNote({ midi: r, time: t, duration: 2 * spb * 0.95 });
    left.addNote({ midi: q, time: t + 2 * spb, duration: 1 * spb * 0.9 });
    left.addNote({ midi: s, time: t + 3 * spb, duration: 1 * spb * 0.9 });
  };
  // Melodías por compás: [midi|null, beats] — los null crean la síncopa (entra a contratiempo)
  const A = [
    [[null, 0.5], [64, 0.5], [67, 0.5], [69, 1], [67, 1.5]],          // Cmaj7
    [[null, 0.5], [72, 1], [71, 0.5], [69, 2]],                        // Am7
    [[null, 1], [62, 0.5], [65, 0.5], [69, 1.5], [67, 0.5]],           // Dm7
    [[71, 1], [69, 0.5], [67, 0.5], [62, 2]],                          // G7
    [[null, 0.5], [67, 0.5], [69, 0.5], [71, 0.5], [72, 2]],           // Cmaj7
    [[76, 1], [72, 1], [69, 1.5], [67, 0.5]],                          // Am7
    [[65, 0.5], [69, 0.5], [72, 1], [69, 1], [67, 1]],                 // Dm7
    [[67, 3], [null, 1]],                                              // G7 (respira)
  ];
  const A2 = [
    ...A.slice(0, 7),
    [[62, 1], [64, 0.5], [67, 0.5], [72, 2]],                          // G7 → sube al puente
  ];
  const B = [
    [[null, 0.5], [69, 1], [72, 1], [76, 1.5]],                        // Fmaj7
    [[74, 1], [71, 1], [67, 2]],                                       // Em7
    [[null, 0.5], [65, 0.5], [69, 1], [74, 2]],                        // Dm7
    [[71, 1.5], [67, 0.5], [62, 2]],                                   // G7
    [[null, 0.5], [69, 1], [72, 1], [76, 1.5]],                        // Fmaj7
    [[79, 1], [76, 1], [72, 2]],                                       // Em7 (clímax suave)
    [[69, 0.5], [72, 0.5], [74, 1], [72, 1], [69, 1]],                 // Dm7
    [[71, 2], [74, 2]],                                                // G7 → vuelta
  ];
  const CODA_RNB = [
    [[null, 0.5], [64, 0.5], [67, 0.5], [69, 1], [67, 1.5]],           // Cmaj7
    [[64, 4]],                                                         // Am7: mi———— (se apaga)
  ];

  const PROG_A = ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7'];
  const PROG_B = ['Fmaj7', 'Em7', 'Dm7', 'G7', 'Fmaj7', 'Em7', 'Dm7', 'G7'];
  const barLen = 4 * spb;
  let bar = 0;
  const put = (chords, melody) => {
    chords.forEach((ch, i) => {
      leftBar(ch, (bar + i) * barLen);
      if (melody) {
        let t = (bar + i) * barLen;
        for (const [m, beats] of melody[i]) {
          if (m !== null) right.addNote({ midi: m, time: t, duration: beats * spb * 0.9 });
          t += beats * spb;
        }
      }
    });
    bar += chords.length;
  };

  put(['Cmaj7', 'G7'], null);        // intro corta solo MI
  put(PROG_A, A);
  put(PROG_A, A2);
  put(PROG_B, B);
  put(PROG_A, A);
  put(['Cmaj7', 'Am7'], CODA_RNB);
  // acorde final Cmaj7 abierto
  const tEnd = bar * barLen;
  left.addNote({ midi: 48, time: tEnd, duration: 4 * spb });
  left.addNote({ midi: 55, time: tEnd, duration: 4 * spb });
  right.addNote({ midi: 64, time: tEnd, duration: 4 * spb });
  right.addNote({ midi: 71, time: tEnd, duration: 4 * spb });
  return midi;
}

// ---------- "Sabor de Verano" — salsa en La menor: tumbao (MI) + montuno (MD) ----------

function buildSaborDeVerano() {
  const BPM_SALSA = 160;
  const spb = 60 / BPM_SALSA;
  const midi = new Midi();
  midi.header.setTempo(BPM_SALSA);
  const right = midi.addTrack(); right.name = 'right';
  const left = midi.addTrack(); left.name = 'left';

  // Progresión tradicional de montuno: Am | Dm | E7 | Am
  const ROOTS = { Am: 45, Dm: 50, E7: 40 };  // raíces graves
  const FIFTHS = { Am: 52, Dm: 57, E7: 47 };
  // Tumbao: silencio en el 1, quinta en el "2y" (1.5), y ANTICIPA la raíz del
  // siguiente acorde en el 4 — el bajo que camina de la salsa.
  const leftBar = (name, nextName, t) => {
    left.addNote({ midi: FIFTHS[name], time: t + 1.5 * spb, duration: 1.2 * spb });
    left.addNote({ midi: ROOTS[nextName], time: t + 3 * spb, duration: 1 * spb });
  };
  // Montuno (riff de corcheas, guajeo) por acorde — Sol#4=68 en E7 (¡tu primera negra útil!)
  const MONTUNO = {
    Am: [64, 69, 72, 76, 72, 69, 72, 69],
    Dm: [62, 65, 69, 74, 69, 65, 69, 65],
    E7: [64, 68, 71, 76, 71, 68, 71, 68],
  };
  // Frases de melodía (soneo) por compás
  const MEL_SALSA = [
    [[null, 0.5], [69, 1], [71, 0.5], [72, 1.5], [null, 0.5]],         // Am
    [[null, 0.5], [74, 1], [72, 0.5], [69, 1.5], [null, 0.5]],         // Dm
    [[null, 0.5], [68, 0.5], [71, 0.5], [76, 1.5], [74, 0.5], [null, 0.5]], // E7
    [[72, 1], [69, 1], [null, 2]],                                     // Am (respira)
    [[null, 0.5], [76, 1], [74, 0.5], [72, 1.5], [null, 0.5]],         // Am
    [[74, 0.5], [72, 0.5], [69, 1], [65, 1], [null, 1]],               // Dm
    [[null, 0.5], [64, 0.5], [68, 0.5], [71, 0.5], [74, 2]],           // E7
    [[76, 1.5], [72, 0.5], [69, 2]],                                   // Am
  ];

  const PROG = ['Am', 'Dm', 'E7', 'Am'];
  const barLen = 4 * spb;
  let bar = 0;
  const putMontuno = (times) => {
    for (let rep = 0; rep < times; rep++) {
      PROG.forEach((ch, i) => {
        const t = (bar + i) * barLen;
        const next = PROG[(i + 1) % PROG.length];
        leftBar(ch, next, t);
        MONTUNO[ch].forEach((m, j) =>
          right.addNote({ midi: m, time: t + j * 0.5 * spb, duration: 0.5 * spb * 0.85 }));
      });
      bar += PROG.length;
    }
  };
  const putMelody = () => {
    for (let i = 0; i < MEL_SALSA.length; i++) {
      const ch = PROG[i % PROG.length];
      const next = PROG[(i + 1) % PROG.length];
      const t = (bar + i) * barLen;
      leftBar(ch, next, t);
      let tm = t;
      for (const [m, beats] of MEL_SALSA[i]) {
        if (m !== null) right.addNote({ midi: m, time: tm, duration: beats * spb * 0.85 });
        tm += beats * spb;
      }
    }
    bar += MEL_SALSA.length;
  };

  putMontuno(2);   // 8 compases de guajeo (entra el ritmo)
  putMelody();     // 8 de melodía
  putMontuno(2);   // 8 de guajeo
  putMelody();     // 8 de melodía
  putMontuno(1);   // 4 de guajeo final
  // golpe final: Am con octava
  const tEnd = bar * barLen;
  left.addNote({ midi: 45, time: tEnd, duration: 2 * spb });
  left.addNote({ midi: 52, time: tEnd, duration: 2 * spb });
  right.addNote({ midi: 69, time: tEnd, duration: 2 * spb });
  right.addNote({ midi: 72, time: tEnd, duration: 2 * spb });
  right.addNote({ midi: 76, time: tEnd, duration: 2 * spb });
  return midi;
}

const SONGS = [
  { file: 'cielo-abierto.mid', title: 'Cielo Abierto — por Claude ✨', build: buildCieloAbierto },
  { file: 'terciopelo.mid', title: 'Terciopelo (R&B) — por Claude ✨', build: buildTerciopelo },
  { file: 'sabor-de-verano.mid', title: 'Sabor de Verano (salsa) — por Claude ✨', build: buildSaborDeVerano },
];

mkdirSync('public/songs/claude', { recursive: true });
for (const s of SONGS) {
  writeFileSync(`public/songs/claude/${s.file}`, Buffer.from(s.build().toArray()));
}
writeFileSync('public/songs/claude/index.json',
  JSON.stringify(SONGS.map(s => ({ file: s.file, title: s.title })), null, 2));
console.log(`Compuestas ${SONGS.length} piezas en public/songs/claude/`);
