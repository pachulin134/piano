import PracticeScreen from './screens/PracticeScreen';
import type { Song, SongNote } from './core/types';

const notes: SongNote[] = [60, 60, 67, 67, 69, 69, 67].map((midi, i) =>
  ({ midi, time: i * 0.5, duration: 0.45, hand: 'right' }));
const demo: Song = { id: 'demo', title: 'Demo', notes, duration: 3.5, difficulty: 1, bestScore: null };

export default function App() {
  return <PracticeScreen song={demo} onExit={s => alert(s === null ? 'Salida' : `Puntuación: ${s}%`)} />;
}
