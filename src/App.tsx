import { useEffect, useState } from 'react';
import NoteFall from './components/NoteFall';
import Keyboard from './components/Keyboard';
import type { SongNote } from './core/types';

const demo: SongNote[] = [60, 62, 64, 65, 67, 69, 71, 72].map((midi, i) =>
  ({ midi, time: i * 0.6, duration: 0.5, hand: i % 2 ? 'left' : 'right' }));

export default function App() {
  const [t, setT] = useState(-4);
  useEffect(() => {
    let raf = 0; let last = performance.now();
    const loop = (now: number) => {
      setT(v => v + (now - last) / 1000); last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div>
      <NoteFall notes={demo} currentTime={t} loMidi={48} hiMidi={83} width={800} height={300} />
      <Keyboard loMidi={48} hiMidi={83} width={800} height={140}
        pressed={new Set()} expected={new Set()} onKey={() => {}} />
    </div>
  );
}
