import { useState } from 'react';
import Keyboard from './components/Keyboard';

export default function App() {
  const [pressed, setPressed] = useState(new Set<number>());
  return (
    <Keyboard
      loMidi={48} hiMidi={83} width={800} height={160}
      pressed={pressed} expected={new Set([60, 64, 67])}
      onKey={(midi, down) => setPressed(prev => {
        const next = new Set(prev);
        if (down) next.add(midi); else next.delete(midi);
        return next;
      })}
    />
  );
}
