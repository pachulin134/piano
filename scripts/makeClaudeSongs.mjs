// Piezas ORIGINALES compuestas por Claude para la sección "Creadas para ti".
// Composición como datos → MIDI. Lección aprendida con la salsa: cada pieza
// necesita un patrón rítmico con identidad (shuffle, tumbao, groove), no solo
// acordes y melodía.
import pkg from '@tonejs/midi';
const { Midi } = pkg;
import { mkdirSync, writeFileSync } from 'node:fs';

/** Añade una secuencia [midi | midi[] | null, beats] a partir de tStart. */
function addSeq(track, seq, tStart, spb, legato = 0.9) {
  let t = tStart;
  for (const [m, beats] of seq) {
    if (m !== null) {
      for (const midi of Array.isArray(m) ? m : [m]) {
        track.addNote({ midi, time: t, duration: beats * spb * legato });
      }
    }
    t += beats * spb;
  }
}

// ---------- "Luna Azul" — blues romántico en Do, 12 compases con shuffle ----------

function buildLunaAzul() {
  const BPM = 58;
  const spb = 60 / BPM;
  const midi = new Midi();
  midi.header.setTempo(BPM);
  const right = midi.addTrack(); right.name = 'right';
  const left = midi.addTrack(); left.name = 'left';

  const L = 2 / 3, S = 1 / 3; // pareja de corcheas con swing (larga-corta)

  // Bajo shuffle clásico: raíz-3ª-5ª-6ª-7ªb-6ª-5ª-3ª en corcheas swing
  const SHUFFLE = {
    C7: [48, 52, 55, 57, 58, 57, 55, 52],
    F7: [41, 45, 48, 50, 51, 50, 48, 45],
    G7: [43, 47, 50, 52, 53, 52, 50, 47],
  };
  const leftBar = (name, t) => {
    const seq = SHUFFLE[name].map((m, i) => [m, i % 2 === 0 ? L : S]);
    addSeq(left, seq, t, spb, 0.95);
  };

  // Progresión de blues de 12 compases
  const BLUES = ['C7', 'C7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'];

  // Coro 1: tema con notas azules (Mib=63, Sib=70) y "crush" Mib→Mi
  const CHORUS1 = [
    [[null, 1], [63, S], [64, L], [67, 1], [69, 1]],
    [[72, 2], [70, 1], [67, 1]],
    [[null, 1], [69, 1], [67, L], [64, S], [62, 1]],
    [[60, 3], [null, 1]],
    [[null, 1], [63, S], [65, L], [69, 1], [70, 1]],
    [[72, 2], [69, 1], [65, 1]],
    [[null, 1], [67, 1], [64, 1], [62, 1]],
    [[60, 2], [null, 2]],
    [[null, 1], [71, 1], [74, 1], [71, 1]],
    [[70, 1], [69, 1], [65, 2]],
    [[63, S], [64, L], [60, 1], [null, 2]],
    [[62, 1], [65, 1], [67, 2]],
  ];
  // Coro 2: la primera mitad una octava arriba (clímax), la vuelta igual
  const up = bar => bar.map(([m, b]) => [m === null ? null : m + 12, b]);
  const CHORUS2 = [
    ...CHORUS1.slice(0, 4).map(up),
    ...CHORUS1.slice(4, 6).map(up),
    ...CHORUS1.slice(6),
  ];
  const OUTRO = [
    [[null, 1], [63, S], [64, L], [67, 2]],
    [[72, 4]],
  ];

  const barLen = 4 * spb;
  let bar = 0;
  const put = (chords, melody) => {
    chords.forEach((ch, i) => {
      leftBar(ch, (bar + i) * barLen);
      if (melody) addSeq(right, melody[i], (bar + i) * barLen, spb, 0.88);
    });
    bar += chords.length;
  };

  put(['C7', 'C7', 'F7', 'G7'], null); // intro: el shuffle entra solo
  put(BLUES, CHORUS1);
  put(BLUES, CHORUS2);
  put(['C7', 'C7'], OUTRO);
  // acorde final: Do6/9 abierto (dulce, romántico)
  const tEnd = bar * barLen;
  for (const m of [36, 48, 55]) left.addNote({ midi: m, time: tEnd, duration: 4 * spb });
  for (const m of [64, 67, 72]) right.addNote({ midi: m, time: tEnd, duration: 4 * spb });
  return midi;
}

// ---------- "Vaivén" — R&B/neo-soul en La menor: bajo sincopado + stabs con novenas ----------

function buildVaiven() {
  const BPM = 88;
  const spb = 60 / BPM;
  const midi = new Midi();
  midi.header.setTempo(BPM);
  const right = midi.addTrack(); right.name = 'right';
  const left = midi.addTrack(); left.name = 'left';

  // [raíz, octava, quinta, séptima]
  const CH = {
    Am7: [45, 57, 52, 55], Dm7: [50, 62, 57, 60], G7: [43, 55, 50, 53],
    Cmaj7: [48, 60, 55, 59], Fmaj7: [41, 53, 48, 52], E7: [40, 52, 47, 50],
  };
  // Groove de bajo sincopado: raíz · raíz octava en el "2y" · quinta · séptima
  const leftBar = (name, t) => {
    const [r, o, q, s] = CH[name];
    addSeq(left, [[r, 1], [null, 0.5], [o, 0.5], [q, 0.75], [null, 0.25], [s, 1]], t, spb, 0.85);
  };

  // "Stabs" a contratiempo (díadas con 7ª y 9ª — el color neo-soul)
  const STABS = {
    Am7: { hi: [72, 76], mid: [69, 72], lo: [67, 71] },
    Dm7: { hi: [74, 77], mid: [72, 76], lo: [69, 72] },
    G7: { hi: [71, 74], mid: [67, 71], lo: [65, 69] },
    Cmaj7: { hi: [76, 79], mid: [72, 76], lo: [71, 74] },
    Fmaj7: { hi: [72, 76], mid: [69, 72], lo: [67, 71] },
    E7: { hi: [71, 74], mid: [68, 71], lo: [64, 68] }, // Sol#4=68
  };
  const stabBar = name => {
    const d = STABS[name];
    return [[null, 0.5], [d.hi, 0.5], [null, 0.5], [d.mid, 1], [null, 0.5], [d.lo, 0.5], [null, 0.5]];
  };

  const VERSE_PROG = ['Am7', 'Dm7', 'G7', 'Cmaj7'];
  // Melodía del verso (semicorcheas sincopadas, entra a contratiempo)
  const MEL_VERSE = [
    [[null, 0.5], [64, 0.25], [67, 0.25], [69, 1], [72, 1.5], [null, 0.5]],
    [[null, 0.25], [74, 0.75], [72, 0.5], [69, 1], [65, 1.5]],
    [[null, 0.5], [67, 0.5], [69, 0.5], [71, 0.5], [74, 2]],
    [[72, 1.5], [71, 0.5], [67, 2]],
    [[null, 0.5], [76, 1], [72, 0.5], [69, 2]],
    [[74, 0.5], [72, 0.25], [69, 0.25], [67, 1], [65, 2]],
    [[null, 0.5], [62, 0.5], [65, 0.5], [67, 0.5], [71, 2]],
    [[72, 3], [null, 1]],
  ];
  const BRIDGE_PROG = ['Fmaj7', 'E7', 'Am7', 'Am7'];
  const MEL_BRIDGE = [
    [[null, 0.5], [69, 1], [72, 1], [76, 1.5]],
    [[74, 0.5], [71, 0.5], [68, 1], [64, 2]],       // el Sol# canta
    [[null, 0.5], [64, 0.5], [67, 0.5], [69, 0.5], [72, 2]],
    [[69, 4]],
  ];

  const barLen = 4 * spb;
  let bar = 0;
  const putGroove = prog => {
    prog.forEach((ch, i) => {
      const t = (bar + i) * barLen;
      leftBar(ch, t);
      addSeq(right, stabBar(ch), t, spb, 0.8);
    });
    bar += prog.length;
  };
  const putMelody = (prog, mel) => {
    prog.forEach((ch, i) => {
      const t = (bar + i) * barLen;
      leftBar(ch, t);
      addSeq(right, mel[i], t, spb, 0.88);
    });
    bar += prog.length;
  };

  putGroove(VERSE_PROG);                              // entra el groove
  putMelody([...VERSE_PROG, ...VERSE_PROG], MEL_VERSE);
  putGroove(VERSE_PROG);
  putMelody(BRIDGE_PROG, MEL_BRIDGE);
  putMelody([...VERSE_PROG, ...VERSE_PROG], MEL_VERSE);
  putGroove(VERSE_PROG);
  // acorde final: Am9 (con la novena Si — despedida suave)
  const tEnd = bar * barLen;
  for (const m of [45, 52]) left.addNote({ midi: m, time: tEnd, duration: 4 * spb });
  for (const m of [64, 69, 71]) right.addNote({ midi: m, time: tEnd, duration: 4 * spb });
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
      addSeq(right, MEL_SALSA[i], t, spb, 0.85);
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
  { file: 'luna-azul.mid', title: 'Luna Azul (blues romántico) — por Claude ✨', build: buildLunaAzul },
  { file: 'vaiven.mid', title: 'Vaivén (R&B) — por Claude ✨', build: buildVaiven },
  { file: 'sabor-de-verano.mid', title: 'Sabor de Verano (salsa) — por Claude ✨', build: buildSaborDeVerano },
];

mkdirSync('public/songs/claude', { recursive: true });
for (const s of SONGS) {
  writeFileSync(`public/songs/claude/${s.file}`, Buffer.from(s.build().toArray()));
}
writeFileSync('public/songs/claude/index.json',
  JSON.stringify(SONGS.map(s => ({ file: s.file, title: s.title })), null, 2));
console.log(`Compuestas ${SONGS.length} piezas en public/songs/claude/`);
