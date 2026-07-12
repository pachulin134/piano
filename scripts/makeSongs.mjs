// @tonejs/midi se publica como CJS (UMD bundle); Node no puede detectar estáticamente
// su export nombrado `Midi`, así que importamos el default y desestructuramos.
import pkg from '@tonejs/midi';
import { mkdirSync, writeFileSync } from 'node:fs';

const { Midi } = pkg;

// [midi, beats] — negra = 1 beat, 100 bpm
const SONGS = [
  {
    file: 'estrellita.mid', title: 'Estrellita (Twinkle Twinkle)',
    right: [[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]],
    left:  [[48,2],[52,2],[53,2],[48,2],[53,2],[48,2],[55,2],[48,2]],
  },
  {
    file: 'himno-alegria.mid', title: 'Himno de la Alegría (Beethoven)',
    right: [[64,1],[64,1],[65,1],[67,1],[67,1],[65,1],[64,1],[62,1],[60,1],[60,1],[62,1],[64,1],[64,1.5],[62,0.5],[62,2]],
    left:  [[48,2],[55,2],[52,2],[55,2],[48,2],[55,2],[43,2],[48,2]],
  },
  {
    file: 'cumpleanos.mid', title: 'Cumpleaños Feliz',
    right: [[60,0.75],[60,0.25],[62,1],[60,1],[65,1],[64,2],[60,0.75],[60,0.25],[62,1],[60,1],[67,1],[65,2]],
    left:  [[48,3],[43,3],[48,3],[41,2],[43,2],[48,2]],
  },
];

const SECONDS_PER_BEAT = 60 / 100;
mkdirSync('public/songs', { recursive: true });

for (const s of SONGS) {
  const midi = new Midi();
  midi.header.setTempo(100);
  for (const [name, seq] of [['right', s.right], ['left', s.left]]) {
    const track = midi.addTrack();
    track.name = name;
    let t = 0;
    for (const [note, beats] of seq) {
      track.addNote({ midi: note, time: t, duration: beats * SECONDS_PER_BEAT * 0.9 });
      t += beats * SECONDS_PER_BEAT;
    }
  }
  writeFileSync(`public/songs/${s.file}`, Buffer.from(midi.toArray()));
}
writeFileSync('public/songs/index.json',
  JSON.stringify(SONGS.map(s => ({ file: s.file, title: s.title })), null, 2));
console.log(`Generadas ${SONGS.length} canciones en public/songs/`);
