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

// ---------- "Tren de Medianoche" — boogie-woogie en Do: el blues rápido y motorizado ----------

function buildTrenDeMedianoche() {
  const BPM = 144;
  const spb = 60 / BPM;
  const midi = new Midi();
  midi.header.setTempo(BPM);
  const right = midi.addTrack(); right.name = 'right';
  const left = midi.addTrack(); left.name = 'left';

  // Bajo boogie: 1-3-5-6-8-6-5-3 en corcheas SIN parar (la locomotora)
  const BOOGIE = {
    C7: [48, 52, 55, 57, 60, 57, 55, 52],
    F7: [41, 45, 48, 50, 53, 50, 48, 45],
    G7: [43, 47, 50, 52, 55, 52, 50, 47],
  };
  const leftBar = (name, t) =>
    addSeq(left, BOOGIE[name].map(m => [m, 0.5]), t, spb, 0.9);

  const BLUES = ['C7', 'C7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7'];

  // Riffs pegadizos con notas azules (Mib=63, Sib=70)
  const riffC = [[60, 0.5], [63, 0.5], [64, 0.5], [67, 0.5], [70, 1], [67, 1]];
  const riffF = [[65, 0.5], [68, 0.5], [69, 0.5], [72, 0.5], [75, 1], [72, 1]];
  const CHORUS1 = [
    riffC,
    riffC,
    riffC,
    [[72, 0.5], [70, 0.5], [67, 0.5], [64, 0.5], [63, 0.5], [60, 1.5]],
    riffF,
    riffF,
    riffC,
    [[60, 0.5], [64, 0.5], [67, 0.5], [70, 0.5], [72, 2]],
    [[74, 0.5], [71, 0.5], [67, 0.5], [65, 0.5], [62, 2]],
    [[72, 0.5], [69, 0.5], [65, 0.5], [63, 0.5], [60, 2]],
    [[60, 1], [63, 0.5], [64, 0.5], [67, 2]],
    [[67, 0.5], [68, 0.5], [69, 0.5], [70, 0.5], [71, 1], [null, 1]], // subida cromática
  ];
  const up = bar => bar.map(([m, b]) => [m === null ? null : m + 12, b]);
  const CHORUS2 = [...CHORUS1.slice(0, 8).map(up), ...CHORUS1.slice(8)];
  // Coro "solo": terceras martilleadas estilo boogie
  const hammerC = [[72, 0.5], [75, 0.5], [72, 0.5], [75, 0.5], [72, 0.5], [75, 0.5], [72, 0.5], [70, 0.5]];
  const hammerF = [[77, 0.5], [80, 0.5], [77, 0.5], [80, 0.5], [77, 0.5], [80, 0.5], [77, 0.5], [75, 0.5]];
  const CHORUS3 = [
    hammerC, hammerC, riffC,
    [[72, 0.5], [70, 0.5], [67, 0.5], [64, 0.5], [63, 0.5], [60, 1.5]],
    hammerF, riffF, riffC,
    [[60, 0.5], [64, 0.5], [67, 0.5], [70, 0.5], [72, 2]],
    [[74, 0.5], [71, 0.5], [67, 0.5], [65, 0.5], [62, 2]],
    [[72, 0.5], [69, 0.5], [65, 0.5], [63, 0.5], [60, 2]],
    [[60, 1], [63, 0.5], [64, 0.5], [67, 2]],
    [[67, 0.5], [68, 0.5], [69, 0.5], [70, 0.5], [71, 1], [null, 1]],
  ];

  const barLen = 4 * spb;
  let bar = 0;
  const put = (chords, melody) => {
    chords.forEach((ch, i) => {
      leftBar(ch, (bar + i) * barLen);
      if (melody) addSeq(right, melody[i], (bar + i) * barLen, spb, 0.85);
    });
    bar += chords.length;
  };

  put(['C7', 'C7', 'F7', 'G7'], null); // arranca la locomotora
  put(BLUES, CHORUS1);
  put(BLUES, CHORUS2);
  put(BLUES, CHORUS3);
  // frenazo final: dos golpes de C7 y acorde largo
  const tEnd = bar * barLen;
  addSeq(right, [[[60, 64, 67, 70], 0.5], [null, 0.5], [[60, 64, 67, 70], 0.5], [null, 0.5], [[60, 64, 67, 72], 2]], tEnd, spb, 0.9);
  addSeq(left, [[36, 0.5], [null, 0.5], [36, 0.5], [null, 0.5], [[36, 48], 2]], tEnd, spb, 0.9);
  return midi;
}

// ---------- "Neón" — R&B funk en Re dórico: bajo sincopado + riff estilo clavinet ----------

function buildNeon() {
  const BPM = 102;
  const spb = 60 / BPM;
  const midi = new Midi();
  midi.header.setTempo(BPM);
  const right = midi.addTrack(); right.name = 'right';
  const left = midi.addTrack(); left.name = 'left';

  // Bajo funk sincopado por acorde: golpe, respiro, octava, séptima-raíz
  const BASS = {
    Dm7: [[50, 0.75], [null, 0.75], [62, 0.5], [null, 0.5], [57, 0.5], [60, 0.5], [null, 0.5]],
    G7: [[43, 0.75], [null, 0.75], [55, 0.5], [null, 0.5], [50, 0.5], [53, 0.5], [null, 0.5]],
    Fmaj7: [[41, 0.75], [null, 0.75], [53, 0.5], [null, 0.5], [48, 0.5], [52, 0.5], [null, 0.5]],
    Em7: [[40, 0.75], [null, 0.75], [52, 0.5], [null, 0.5], [47, 0.5], [50, 0.5], [null, 0.5]],
  };
  const leftBar = (name, t) => addSeq(left, BASS[name], t, spb, 0.8);

  // Riff "clavinet": díadas cortantes en semicorcheas a contratiempo
  const CLAV = {
    Dm7: [[null, 0.25], [[65, 69], 0.25], [null, 0.25], [[65, 69], 0.25], [[64, 67], 0.5], [null, 0.5], [[62, 65], 0.25], [[62, 65], 0.25], [null, 0.5], [[60, 64], 0.5], [null, 0.5]],
    G7: [[null, 0.25], [[65, 71], 0.25], [null, 0.25], [[65, 71], 0.25], [[62, 67], 0.5], [null, 0.5], [[59, 65], 0.25], [[59, 65], 0.25], [null, 0.5], [[57, 62], 0.5], [null, 0.5]],
  };
  const VAMP = ['Dm7', 'G7'];

  // Melodía funk: gancho repetido, semicorcheas a contratiempo, sin huecos largos
  const HOOK = [[null, 0.5], [74, 0.25], [72, 0.25], [69, 0.5], [67, 0.25], [69, 0.25], [65, 1.5], [null, 0.5]];
  const MEL_A = [
    HOOK,                                                                  // Dm7
    [[null, 0.25], [67, 0.25], [69, 0.25], [71, 0.25], [74, 1], [71, 0.5], [67, 1.5]], // G7
    HOOK,                                                                  // Dm7
    [[74, 0.5], [76, 0.25], [74, 0.25], [71, 0.5], [69, 0.5], [67, 0.5], [65, 0.5], [62, 1]], // G7
  ];
  const MEL_B = [
    [[null, 0.5], [69, 0.5], [72, 0.5], [76, 1], [74, 0.5], [72, 1]],      // Fmaj7
    [[71, 0.5], [67, 0.25], [64, 0.25], [67, 1], [71, 0.5], [74, 1.5]],    // Em7
    [[null, 0.25], [74, 0.25], [72, 0.25], [69, 0.25], [72, 1], [69, 0.5], [65, 1.5]], // Dm7
    [[62, 0.5], [65, 0.5], [67, 0.5], [71, 0.5], [74, 2]],                 // G7
  ];

  const barLen = 4 * spb;
  let bar = 0;
  const putClav = times => {
    for (let r = 0; r < times; r++) {
      VAMP.forEach((ch, i) => {
        const t = (bar + i) * barLen;
        leftBar(ch, t);
        addSeq(right, CLAV[ch], t, spb, 0.7);
      });
      bar += VAMP.length;
    }
  };
  const putMel = (prog, mel, reps) => {
    for (let r = 0; r < reps; r++) {
      prog.forEach((ch, i) => {
        const t = (bar + i) * barLen;
        leftBar(ch, t);
        addSeq(right, mel[i], t, spb, 0.85);
      });
      bar += prog.length;
    }
  };

  putClav(2);                                    // 4 compases de riff
  putMel(['Dm7', 'G7', 'Dm7', 'G7'], MEL_A, 2);  // 8 de melodía
  putClav(2);                                    // 4 de riff
  putMel(['Fmaj7', 'Em7', 'Dm7', 'G7'], MEL_B, 2); // 8 de puente
  putMel(['Dm7', 'G7', 'Dm7', 'G7'], MEL_A, 2);  // 8 de melodía
  putClav(2);                                    // 4 de riff final
  // golpe final: Dm9
  const tEnd = bar * barLen;
  addSeq(left, [[[38, 50], 2]], tEnd, spb, 1);
  addSeq(right, [[[62, 65, 69, 76], 2]], tEnd, spb, 1);
  return midi;
}

const SONGS = [
  { file: 'tren-de-medianoche.mid', title: 'Tren de Medianoche (boogie blues) — por Claude ✨', build: buildTrenDeMedianoche },
  { file: 'neon.mid', title: 'Neón (R&B funk) — por Claude ✨', build: buildNeon },
  { file: 'sabor-de-verano.mid', title: 'Sabor de Verano (salsa) — por Claude ✨', build: buildSaborDeVerano },
];

mkdirSync('public/songs/claude', { recursive: true });
for (const s of SONGS) {
  writeFileSync(`public/songs/claude/${s.file}`, Buffer.from(s.build().toArray()));
}
writeFileSync('public/songs/claude/index.json',
  JSON.stringify(SONGS.map(s => ({ file: s.file, title: s.title })), null, 2));
console.log(`Compuestas ${SONGS.length} piezas en public/songs/claude/`);
