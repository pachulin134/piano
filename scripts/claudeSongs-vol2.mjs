// Volumen 2 del cancionero original de Claude — 10 piezas de estilos variados.
// Perfil del usuario: tempo alto, ritmo continuo sin pausas, melódico y fluido.
import pkg from '@tonejs/midi';
const { Midi } = pkg;

/** Añade [midi | midi[] | null, beats] secuenciales desde tStart. */
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

/** Valida que cada compás sume exactamente barBeats (aborta si no — red de seguridad). */
function bars(barBeats, list, name) {
  list.forEach((bar, i) => {
    const sum = bar.reduce((a, [, b]) => a + b, 0);
    if (Math.abs(sum - barBeats) > 1e-6) {
      throw new Error(`Compás ${i + 1} de ${name} suma ${sum}, no ${barBeats}`);
    }
  });
  return list;
}

function newSong(bpm) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  const right = midi.addTrack(); right.name = 'right';
  const left = midi.addTrack(); left.name = 'left';
  return { midi, right, left, spb: 60 / bpm };
}

const up = bar => bar.map(([m, b]) => [m === null ? null : (Array.isArray(m) ? m.map(x => x + 12) : m + 12), b]);

// ---------- 1. "Vals de la Plaza" — vals criollo (estilo La Foule), 3/4 rápido ----------

function buildValsDeLaPlaza() {
  const { midi, right, left, spb } = newSong(168);
  const LH = { // vals: bajo + chord + chord (um-pa-pa)
    Am: [45, [57, 60]], E7: [40, [56, 59]], Dm: [50, [57, 62]],
    F: [41, [57, 60]], C: [48, [55, 60]], G: [43, [55, 59]],
  };
  const lhBar = n => [[LH[n][0], 1], [LH[n][1], 1], [LH[n][1], 1]];
  const A_PROG = ['Am', 'E7', 'E7', 'Am', 'Am', 'Dm', 'E7', 'Am'];
  const B_PROG = ['C', 'G', 'G', 'C', 'C', 'Dm', 'E7', 'Am'];
  const MEL_A = bars(3, [
    [[69, 0.5], [72, 0.5], [76, 0.5], [74, 0.5], [72, 0.5], [71, 0.5]],
    [[71, 1], [68, 1], [64, 1]],
    [[64, 0.5], [68, 0.5], [71, 0.5], [74, 0.5], [71, 0.5], [68, 0.5]],
    [[69, 2], [null, 1]],
    [[69, 0.5], [71, 0.5], [72, 0.5], [74, 0.5], [76, 0.5], [77, 0.5]],
    [[77, 1], [74, 1], [69, 1]],
    [[68, 0.5], [71, 0.5], [74, 0.5], [71, 0.5], [68, 0.5], [64, 0.5]],
    [[69, 2], [null, 1]],
  ], 'vals A');
  const MEL_B = bars(3, [
    [[72, 0.5], [76, 0.5], [79, 0.5], [76, 0.5], [72, 0.5], [67, 0.5]],
    [[74, 1], [71, 1], [67, 1]],
    [[67, 0.5], [71, 0.5], [74, 0.5], [77, 0.5], [74, 0.5], [71, 0.5]],
    [[72, 2], [null, 1]],
    [[72, 0.5], [74, 0.5], [76, 0.5], [77, 0.5], [76, 0.5], [74, 0.5]],
    [[77, 1.5], [74, 0.5], [71, 1]],
    [[71, 0.5], [68, 0.5], [71, 0.5], [74, 0.5], [76, 0.5], [77, 0.5]],
    [[76, 1], [72, 1], [69, 1]],
  ], 'vals B');

  const barLen = 3 * spb;
  let bar = 0;
  const put = (prog, mel) => {
    prog.forEach((ch, i) => {
      addSeq(left, lhBar(ch), (bar + i) * barLen, spb, 0.85);
      if (mel) addSeq(right, mel[i], (bar + i) * barLen, spb, 0.88);
    });
    bar += prog.length;
  };
  put(['Am', 'E7', 'E7', 'Am'], null);
  put(A_PROG, MEL_A);
  put(A_PROG, MEL_A.map(up));
  put(B_PROG, MEL_B);
  put(A_PROG, MEL_A);
  put(B_PROG, MEL_B.map(up));
  put(A_PROG, MEL_A.map(up));
  const tEnd = bar * barLen;
  addSeq(left, [[[45, 52], 3]], tEnd, spb, 1);
  addSeq(right, [[[69, 72, 76], 3]], tEnd, spb, 1);
  return midi;
}

// ---------- 2. "Mambo Caliente" — salsa mayor en Do con sección de "metales" ----------

function buildMamboCaliente() {
  const { midi, right, left, spb } = newSong(170);
  const ROOTS = { C: 48, F: 41, G: 43 };
  const FIFTHS = { C: 55, F: 48, G: 50 };
  const lhBar = (n, next, t) => { // tumbao anticipado
    left.addNote({ midi: FIFTHS[n], time: t + 1.5 * spb, duration: 1.2 * spb });
    left.addNote({ midi: ROOTS[next], time: t + 3 * spb, duration: 1 * spb });
  };
  const MONTUNO = {
    C: [64, 67, 72, 76, 72, 67, 72, 67],
    F: [65, 69, 72, 77, 72, 69, 72, 69],
    G: [62, 67, 71, 74, 71, 67, 71, 67],
  };
  const STAB = { C: [72, 76, 79], F: [69, 72, 77], G: [67, 71, 74] };
  const mamboBar = n => [[null, 0.5], [STAB[n], 0.5], [null, 0.5], [STAB[n], 0.5], [null, 1], [STAB[n], 0.5], [null, 0.5]];
  const MEL = bars(4, [
    [[null, 0.5], [72, 1], [74, 0.5], [76, 1.5], [null, 0.5]],
    [[77, 1], [76, 0.5], [74, 1], [72, 1.5]],
    [[null, 0.5], [74, 0.5], [71, 0.5], [74, 1], [67, 1.5]],
    [[72, 1], [76, 1], [null, 2]],
    [[null, 0.5], [79, 1], [77, 0.5], [76, 1.5], [null, 0.5]],
    [[77, 0.5], [74, 0.5], [72, 1], [69, 2]],
    [[null, 0.5], [67, 0.5], [71, 0.5], [74, 0.5], [77, 2]],
    [[76, 1.5], [72, 0.5], [72, 2]],
  ], 'mambo mel');
  const PROG = ['C', 'F', 'G', 'F'];
  const barLen = 4 * spb;
  let bar = 0;
  const section = (mode, reps) => {
    for (let r = 0; r < reps; r++) {
      const prog = mode === 'mel' ? [...PROG, ...PROG] : PROG;
      prog.forEach((ch, i) => {
        const t = (bar + i) * barLen;
        lhBar(ch, prog[(i + 1) % prog.length], t);
        if (mode === 'montuno') MONTUNO[ch].forEach((m, j) => right.addNote({ midi: m, time: t + j * 0.5 * spb, duration: 0.5 * spb * 0.85 }));
        if (mode === 'mambo') addSeq(right, mamboBar(ch), t, spb, 0.8);
        if (mode === 'mel') addSeq(right, MEL[i], t, spb, 0.85);
      });
      bar += prog.length;
    }
  };
  section('montuno', 2); section('mel', 1); section('mambo', 2); section('mel', 1); section('montuno', 1);
  const tEnd = bar * barLen;
  addSeq(right, [[[72, 76, 79], 0.5], [null, 0.5], [[72, 76, 79], 1]], tEnd, spb, 0.9);
  addSeq(left, [[36, 0.5], [null, 0.5], [[36, 48], 1]], tEnd, spb, 0.9);
  return midi;
}

// ---------- 3. "Cha-Cha del Parque" — cha-cha-chá en Do ----------

function buildChaCha() {
  const { midi, right, left, spb } = newSong(118);
  const LH = { C: [48, 55], F: [41, 48], G: [43, 50], Am: [45, 52], Dm: [50, 57] };
  const lhBar = n => [[LH[n][0], 1], [LH[n][1], 1], [LH[n][0], 1], [LH[n][1], 0.5], [LH[n][1], 0.5]];
  const MEL_A = bars(4, [
    [[76, 1], [74, 1], [72, 0.5], [72, 0.5], [72, 1]],                 // ¡cha-cha-chá!
    [[74, 1], [72, 1], [71, 0.5], [71, 0.5], [71, 1]],
    [[72, 0.5], [74, 0.5], [76, 0.5], [77, 0.5], [76, 0.5], [74, 0.5], [72, 1]],
    [[67, 1], [69, 1], [72, 0.5], [72, 0.5], [72, 1]],
  ], 'chacha A');
  const MEL_B = bars(4, [
    [[69, 1], [72, 1], [76, 0.5], [76, 0.5], [76, 1]],
    [[74, 0.5], [72, 0.5], [69, 1], [65, 0.5], [65, 0.5], [65, 1]],
    [[67, 0.5], [71, 0.5], [74, 1], [71, 0.5], [67, 0.5], [62, 1]],
    [[72, 1], [76, 1], [72, 0.5], [72, 0.5], [72, 1]],
  ], 'chacha B');
  const A_PROG = ['C', 'G', 'F', 'C'];
  const B_PROG = ['Am', 'Dm', 'G', 'C'];
  const barLen = 4 * spb;
  let bar = 0;
  const put = (prog, mel) => {
    prog.forEach((ch, i) => {
      addSeq(left, lhBar(ch), (bar + i) * barLen, spb, 0.8);
      if (mel) addSeq(right, mel[i], (bar + i) * barLen, spb, 0.82);
    });
    bar += prog.length;
  };
  put(['C', 'G'], null);
  put(A_PROG, MEL_A); put(A_PROG, MEL_A.map(up)); put(B_PROG, MEL_B);
  put(A_PROG, MEL_A); put(B_PROG, MEL_B.map(up)); put(A_PROG, MEL_A.map(up));
  const tEnd = bar * barLen;
  addSeq(right, [[[72, 76], 0.5], [[72, 76], 0.5], [[60, 64, 67, 72], 2]], tEnd, spb, 0.9);
  addSeq(left, [[48, 0.5], [55, 0.5], [[36, 48], 2]], tEnd, spb, 0.9);
  return midi;
}

// ---------- 4. "Blues del Corazón" — blues romántico con tresillos rodantes (nunca se para) ----------

function buildBluesDelCorazon() {
  const { midi, right, left, spb } = newSong(63);
  const T = 1 / 3;
  const ROLL = { Am: [45, 52, 57], Dm: [50, 57, 62], E7: [40, 47, 56] };
  const lhBar = (n, t) => { // 4 tresillos por compás: el mar de fondo romántico
    for (let beat = 0; beat < 4; beat++) {
      ROLL[n].forEach((m, j) =>
        left.addNote({ midi: m, time: t + (beat + j * T) * spb, duration: T * spb * 0.95 }));
    }
  };
  const BLUES = ['Am', 'Am', 'Am', 'Am', 'Dm', 'Dm', 'Am', 'Am', 'E7', 'Dm', 'Am', 'E7'];
  const CHORUS = bars(4, [
    [[null, 1], [69, 1], [72, 1], [76, 1]],
    [[74, 2 * T], [72, T], [69, 2], [null, 1]],
    [[null, 1], [72, 1], [74, 2 * T], [76, T], [77, 1]],
    [[76, 2], [72, 1], [69, 1]],
    [[null, 1], [74, 1], [77, 2 * T], [76, T], [74, 1]],
    [[72, 2], [69, 1], [65, 1]],
    [[null, 1], [69, 2 * T], [71, T], [72, 1], [76, 1]],
    [[74, 3], [null, 1]],
    [[null, 1], [71, 1], [68, 2 * T], [71, T], [74, 1]],
    [[74, 2 * T], [72, T], [69, 2], [65, 1]],
    [[64, 2 * T], [63, T], [64, 1], [69, 2]],
    [[68, 1], [71, 1], [74, 1], [76, 1]],
  ], 'blues corazon');
  const barLen = 4 * spb;
  let bar = 0;
  const put = (prog, mel) => {
    prog.forEach((ch, i) => {
      lhBar(ch, (bar + i) * barLen);
      if (mel) addSeq(right, mel[i], (bar + i) * barLen, spb, 0.92);
    });
    bar += prog.length;
  };
  put(['Am', 'E7'], null);
  put(BLUES, CHORUS);
  put(BLUES, [...CHORUS.slice(0, 4).map(up), ...CHORUS.slice(4)]);
  const tEnd = bar * barLen;
  addSeq(left, [[[33, 45], 4]], tEnd, spb, 1);
  addSeq(right, [[[64, 69, 72], 4]], tEnd, spb, 1);
  return midi;
}

// ---------- 5. "Rock del Garaje" — rock and roll de los 50 ----------

function buildRockDelGaraje() {
  const { midi, right, left, spb } = newSong(150);
  const POWER = { C: [48, 55], F: [41, 48], G: [43, 50] };
  const lhBar = (n, t) => { // quintas machacadas en corcheas
    for (let i = 0; i < 8; i++) {
      const m = i % 4 === 3 ? POWER[n][0] + 9 : POWER[n][1]; // sexta de paso rockera
      left.addNote({ midi: POWER[n][0], time: t + i * 0.5 * spb, duration: 0.5 * spb * 0.85 });
      left.addNote({ midi: m, time: t + i * 0.5 * spb, duration: 0.5 * spb * 0.85 });
    }
  };
  const RIFF = {
    C: [[72, 0.5], [72, 0.5], [null, 0.5], [72, 0.5], [70, 0.5], [67, 0.5], [70, 0.5], [null, 0.5]],
    F: [[77, 0.5], [77, 0.5], [null, 0.5], [77, 0.5], [75, 0.5], [72, 0.5], [75, 0.5], [null, 0.5]],
    G: [[79, 0.5], [79, 0.5], [null, 0.5], [79, 0.5], [77, 0.5], [74, 0.5], [77, 0.5], [null, 0.5]],
  };
  const FILL = bars(4, [[[60, 0.5], [63, 0.5], [64, 0.5], [67, 0.5], [70, 0.5], [72, 0.5], [75, 0.5], [76, 0.5]]], 'rock fill')[0];
  const PROG = ['C', 'C', 'C', 'C', 'F', 'F', 'C', 'C', 'G', 'F', 'C', 'G'];
  const barLen = 4 * spb;
  let bar = 0;
  const chorus = (variant) => {
    PROG.forEach((ch, i) => {
      const t = (bar + i) * barLen;
      lhBar(ch, t);
      const line = i === 3 || i === 7 ? FILL : RIFF[ch];
      addSeq(right, variant === 'up' ? up(line) : line, t, spb, 0.8);
    });
    bar += PROG.length;
  };
  ['C', 'C'].forEach((ch, i) => lhBar(ch, (bar + i) * barLen)); bar += 2;
  chorus(); chorus('up'); chorus();
  const tEnd = bar * barLen;
  addSeq(right, [[[60, 64, 67, 70], 0.5], [null, 0.5], [[60, 64, 67, 70], 0.5], [null, 0.5], [[60, 64, 67, 72], 2]], tEnd, spb, 0.9);
  addSeq(left, [[36, 0.5], [null, 0.5], [36, 0.5], [null, 0.5], [[36, 48], 2]], tEnd, spb, 0.9);
  return midi;
}

// ---------- 6. "Ragtime de Feria" — piano de carrusel ----------

function buildRagtimeDeFeria() {
  const { midi, right, left, spb } = newSong(104);
  const STRIDE = {
    C: [48, [55, 60, 64]], G7: [43, [53, 59, 62]], F: [41, [53, 57, 60]], C7: [48, [55, 58, 64]],
  };
  const lhBar = n => {
    const [b, T] = STRIDE[n];
    return [[b, 0.5], [T, 0.5], [b + 7, 0.5], [T, 0.5], [b, 0.5], [T, 0.5], [b + 7, 0.5], [T, 0.5]];
  };
  // Célula rag 3+3+2 (semicorcheas sincopadas)
  const MEL_A = bars(4, [
    [[67, 0.75], [72, 0.75], [76, 0.5], [74, 0.75], [72, 0.75], [67, 0.5]],
    [[65, 0.75], [71, 0.75], [74, 0.5], [71, 0.75], [65, 0.75], [62, 0.5]],
    [[67, 0.75], [72, 0.75], [76, 0.5], [79, 0.75], [76, 0.75], [72, 0.5]],
    [[74, 0.25], [76, 0.25], [74, 0.5], [72, 1], [67, 1], [60, 1]],
  ], 'rag A');
  const MEL_B = bars(4, [
    [[72, 0.75], [76, 0.75], [79, 0.5], [77, 0.75], [76, 0.75], [72, 0.5]],
    [[70, 0.75], [74, 0.75], [77, 0.5], [74, 0.75], [70, 0.75], [65, 0.5]],
    [[69, 0.75], [72, 0.75], [77, 0.5], [76, 0.25], [74, 0.25], [72, 0.5], [69, 0.5], [65, 0.5]],
    [[67, 0.5], [64, 0.5], [62, 0.5], [59, 0.5], [60, 2]],
  ], 'rag B');
  const A_PROG = ['C', 'G7', 'C', 'G7'];
  const B_PROG = ['C7', 'F', 'G7', 'C'];
  const barLen = 4 * spb;
  let bar = 0;
  const put = (prog, mel) => {
    prog.forEach((ch, i) => {
      addSeq(left, lhBar(ch), (bar + i) * barLen, spb, 0.75);
      if (mel) addSeq(right, mel[i], (bar + i) * barLen, spb, 0.8);
    });
    bar += prog.length;
  };
  put(['C', 'G7'], null);
  put(A_PROG, MEL_A); put(A_PROG, MEL_A.map(up)); put(B_PROG, MEL_B);
  put(A_PROG, MEL_A); put(B_PROG, MEL_B); put(A_PROG, MEL_A.map(up));
  const tEnd = bar * barLen;
  addSeq(right, [[[72, 76], 0.5], [[67, 72], 0.5], [[60, 64, 67, 72], 2]], tEnd, spb, 0.9);
  addSeq(left, [[48, 0.5], [43, 0.5], [[36, 48], 2]], tEnd, spb, 0.9);
  return midi;
}

// ---------- 7. "Tango del Farol" — tango con bajo habanera ----------

function buildTangoDelFarol() {
  const { midi, right, left, spb } = newSong(120);
  const HAB = { Am: [45, 52], E7: [40, 47], Dm: [50, 57], G: [43, 50], C: [48, 55], F: [41, 48] };
  const lhBar = n => {
    const [r, q] = HAB[n];
    return [[r, 1.5], [q, 0.5], [r, 1], [q, 1]];
  };
  const MEL_A = bars(4, [
    [[69, 0.5], [71, 0.5], [72, 0.5], [74, 0.5], [76, 1.5], [null, 0.5]],
    [[76, 0.5], [74, 0.5], [71, 0.5], [68, 0.5], [64, 2]],
    [[65, 0.5], [67, 0.5], [69, 0.5], [71, 0.5], [74, 1.5], [null, 0.5]],
    [[72, 1], [71, 0.5], [69, 0.5], [69, 2]],
  ], 'tango A');
  const MEL_B = bars(4, [
    [[72, 0.5], [74, 0.5], [76, 0.5], [77, 0.5], [79, 1.5], [null, 0.5]],
    [[77, 0.5], [76, 0.5], [74, 0.5], [71, 0.5], [67, 2]],
    [[69, 0.5], [72, 0.5], [76, 0.5], [74, 0.5], [72, 0.5], [71, 0.5], [69, 0.5], [68, 0.5]],
    [[69, 1], [76, 1], [69, 2]],
  ], 'tango B');
  const A_PROG = ['Am', 'E7', 'Dm', 'Am'];
  const B_PROG = ['C', 'G', 'Dm', 'E7'];
  const barLen = 4 * spb;
  let bar = 0;
  const put = (prog, mel) => {
    prog.forEach((ch, i) => {
      addSeq(left, lhBar(ch), (bar + i) * barLen, spb, 0.7); // marcato seco
      if (mel) addSeq(right, mel[i], (bar + i) * barLen, spb, 0.85);
    });
    bar += prog.length;
  };
  put(['Am', 'E7'], null);
  put(A_PROG, MEL_A); put(A_PROG, MEL_A.map(up)); put(B_PROG, MEL_B);
  put(A_PROG, MEL_A.map(up)); put(B_PROG, MEL_B); put(A_PROG, MEL_A);
  // el "chan... ¡chan!" final obligatorio del tango
  const tEnd = bar * barLen;
  addSeq(right, [[[68, 71, 76], 1], [null, 0.5], [[69, 72, 76], 1.5]], tEnd, spb, 0.8);
  addSeq(left, [[40, 1], [null, 0.5], [[33, 45], 1.5]], tEnd, spb, 0.8);
  return midi;
}

// ---------- 8. "Swing de la Esquina" — jazz swing con bajo caminante ----------

function buildSwingDeLaEsquina() {
  const { midi, right, left, spb } = newSong(138);
  const L = 2 / 3, S = 1 / 3;
  // Bajo caminante por compás (negras, siempre andando hacia el siguiente acorde)
  const WALK = {
    C_Am: [48, 52, 55, 47], Am_Dm: [45, 48, 52, 49], Dm_G: [50, 53, 57, 55], G_C: [43, 47, 50, 52],
    C_F: [48, 52, 55, 53], F_Dm: [53, 52, 50, 48], G_G: [43, 47, 50, 43],
  };
  const lhBar = key => WALK[key].map(m => [m, 1]);
  const swing = pairs => pairs.flatMap(([a, b]) => [[a, L], [b, S]]);
  const MEL_A = bars(4, [
    [...swing([[72, 74]]), [76, 1], [74, 1], [72, 1]],
    [[69, 1], ...swing([[67, 69]]), [67, 1], [64, 1]],
    [...swing([[62, 64], [65, 67]]), [69, 1], [72, 1]],
    [[71, 2], [67, 1], [null, 1]],
  ], 'swing A');
  const MEL_B = bars(4, [
    [...swing([[76, 77]]), [79, 1], [76, 1], [74, 1]],
    [[74, 1], ...swing([[72, 74]]), [72, 1], [69, 1]],
    [...swing([[65, 67], [69, 71]]), [72, 1], [74, 1]],
    [[72, 2], [null, 2]],
  ], 'swing B');
  const A_KEYS = ['C_Am', 'Am_Dm', 'Dm_G', 'G_C'];
  const B_KEYS = ['C_F', 'F_Dm', 'Dm_G', 'G_G'];
  const barLen = 4 * spb;
  let bar = 0;
  const put = (keys, mel) => {
    keys.forEach((k, i) => {
      addSeq(left, lhBar(k), (bar + i) * barLen, spb, 0.85);
      if (mel) addSeq(right, mel[i], (bar + i) * barLen, spb, 0.8);
    });
    bar += keys.length;
  };
  put(['C_Am', 'Am_Dm'].slice(0, 2), null);
  put(A_KEYS, MEL_A); put(A_KEYS, MEL_A.map(up)); put(B_KEYS, MEL_B);
  put(A_KEYS, MEL_A); put(B_KEYS, MEL_B.map(up)); put(A_KEYS, MEL_A);
  const tEnd = bar * barLen;
  addSeq(right, [[[71, 74], L], [[72, 76], S], [[64, 67, 72], 3]], tEnd, spb, 0.9);
  addSeq(left, [[43, L], [47, S], [[36, 48], 3]], tEnd, spb, 0.9);
  return midi;
}

// ---------- 9. "Bachata de la Luna" — bachata romántica y bailable ----------

function buildBachataDeLaLuna() {
  const { midi, right, left, spb } = newSong(128);
  const B = { Am: [45, 52], Dm: [50, 57], E7: [40, 47], F: [41, 48], G: [43, 50] };
  const lhBar = n => {
    const [r, q] = B[n];
    return [[r, 1], [null, 0.5], [r, 0.5], [q, 0.75], [null, 0.25], [q, 1]];
  };
  // guitarra bachatera: arpegio con terceras dulces
  const MEL_A = bars(4, [
    [[69, 0.5], [72, 0.5], [76, 0.5], [72, 0.5], [[69, 72], 0.5], [null, 0.5], [[69, 72], 1]],
    [[65, 0.5], [69, 0.5], [74, 0.5], [69, 0.5], [[65, 69], 0.5], [null, 0.5], [[65, 69], 1]],
    [[64, 0.5], [68, 0.5], [71, 0.5], [74, 0.5], [76, 0.5], [74, 0.5], [71, 0.5], [68, 0.5]],
    [[69, 0.5], [72, 0.5], [76, 1], [72, 1], [69, 1]],
  ], 'bachata A');
  const MEL_B = bars(4, [
    [[77, 0.5], [76, 0.5], [74, 0.5], [72, 0.5], [[69, 74], 1], [[69, 72], 1]],
    [[74, 0.5], [72, 0.5], [71, 0.5], [69, 0.5], [[67, 71], 1], [[65, 69], 1]],
    [[65, 0.5], [69, 0.5], [72, 0.5], [74, 0.5], [76, 1], [77, 1]],
    [[76, 0.5], [74, 0.5], [72, 0.5], [71, 0.5], [69, 2]],
  ], 'bachata B');
  const A_PROG = ['Am', 'Dm', 'E7', 'Am'];
  const B_PROG = ['F', 'G', 'F', 'E7'];
  const barLen = 4 * spb;
  let bar = 0;
  const put = (prog, mel) => {
    prog.forEach((ch, i) => {
      addSeq(left, lhBar(ch), (bar + i) * barLen, spb, 0.8);
      if (mel) addSeq(right, mel[i], (bar + i) * barLen, spb, 0.85);
    });
    bar += prog.length;
  };
  put(['Am', 'E7'], null);
  put(A_PROG, MEL_A); put(A_PROG, MEL_A); put(B_PROG, MEL_B);
  put(A_PROG, MEL_A.map(up)); put(B_PROG, MEL_B); put(A_PROG, MEL_A);
  const tEnd = bar * barLen;
  addSeq(right, [[[69, 72, 76], 2]], tEnd, spb, 1);
  addSeq(left, [[[33, 45], 2]], tEnd, spb, 1);
  return midi;
}

// ---------- 10. "Cumbia de Estrellas" — cumbia luminosa ----------

function buildCumbiaDeEstrellas() {
  const { midi, right, left, spb } = newSong(100);
  const B = { C: [48, 55], F: [41, 48], G: [43, 50], Am: [45, 52] };
  const lhBar = n => {
    const [r, q] = B[n];
    return [[r, 1], [q, 1], [r, 1], [q, 1]];
  };
  const CHOP = { C: [64, 67], F: [65, 69], G: [62, 67], Am: [64, 69] }; // acordes a contratiempo
  const chopBar = n => [[null, 0.5], [CHOP[n], 0.5], [null, 0.5], [CHOP[n], 0.5], [null, 0.5], [CHOP[n], 0.5], [null, 0.5], [CHOP[n], 0.5]];
  const MEL = bars(4, [
    [[76, 0.5], [76, 0.5], [74, 0.5], [72, 0.5], [74, 1], [72, 1]],
    [[69, 0.5], [69, 0.5], [72, 0.5], [74, 0.5], [72, 1], [69, 1]],
    [[67, 0.5], [67, 0.5], [71, 0.5], [74, 0.5], [71, 1], [67, 1]],
    [[72, 0.5], [72, 0.5], [76, 0.5], [74, 0.5], [72, 2]],
    [[76, 0.5], [77, 0.5], [76, 0.5], [74, 0.5], [72, 1], [74, 1]],
    [[74, 0.5], [76, 0.5], [74, 0.5], [72, 0.5], [69, 1], [72, 1]],
    [[71, 0.5], [74, 0.5], [77, 0.5], [74, 0.5], [71, 1], [67, 1]],
    [[72, 1], [76, 1], [72, 2]],
  ], 'cumbia');
  const PROG = ['C', 'Am', 'G', 'C', 'C', 'Am', 'G', 'C'];
  const CHOP_PROG = ['C', 'F', 'G', 'C'];
  const barLen = 4 * spb;
  let bar = 0;
  const putChop = reps => {
    for (let r = 0; r < reps; r++) {
      CHOP_PROG.forEach((ch, i) => {
        addSeq(left, lhBar(ch), (bar + i) * barLen, spb, 0.8);
        addSeq(right, chopBar(ch), (bar + i) * barLen, spb, 0.7);
      });
      bar += CHOP_PROG.length;
    }
  };
  const putMel = () => {
    PROG.forEach((ch, i) => {
      addSeq(left, lhBar(ch), (bar + i) * barLen, spb, 0.8);
      addSeq(right, MEL[i], (bar + i) * barLen, spb, 0.85);
    });
    bar += PROG.length;
  };
  putChop(1); putMel(); putChop(1); putMel(); putChop(1);
  const tEnd = bar * barLen;
  addSeq(right, [[[64, 67, 72], 0.5], [null, 0.5], [[60, 64, 67, 72], 2]], tEnd, spb, 0.9);
  addSeq(left, [[48, 0.5], [null, 0.5], [[36, 48], 2]], tEnd, spb, 0.9);
  return midi;
}

export const SONGS2 = [
  { file: 'vals-de-la-plaza.mid', title: 'Vals de la Plaza', style: 'vals criollo', build: buildValsDeLaPlaza },
  { file: 'mambo-caliente.mid', title: 'Mambo Caliente', style: 'salsa', build: buildMamboCaliente },
  { file: 'cha-cha-del-parque.mid', title: 'Cha-Cha del Parque', style: 'cha-cha-chá', build: buildChaCha },
  { file: 'blues-del-corazon.mid', title: 'Blues del Corazón', style: 'blues romántico', build: buildBluesDelCorazon },
  { file: 'rock-del-garaje.mid', title: 'Rock del Garaje', style: 'rock and roll', build: buildRockDelGaraje },
  { file: 'ragtime-de-feria.mid', title: 'Ragtime de Feria', style: 'ragtime', build: buildRagtimeDeFeria },
  { file: 'tango-del-farol.mid', title: 'Tango del Farol', style: 'tango', build: buildTangoDelFarol },
  { file: 'swing-de-la-esquina.mid', title: 'Swing de la Esquina', style: 'jazz swing', build: buildSwingDeLaEsquina },
  { file: 'bachata-de-la-luna.mid', title: 'Bachata de la Luna', style: 'bachata', build: buildBachataDeLaLuna },
  { file: 'cumbia-de-estrellas.mid', title: 'Cumbia de Estrellas', style: 'cumbia', build: buildCumbiaDeEstrellas },
];
