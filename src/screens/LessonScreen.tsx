import { useEffect, useState } from 'react';
import TeachStep from '../components/lesson/TeachStep';
import PlayStep from '../components/lesson/PlayStep';
import ChooseStep from '../components/lesson/ChooseStep';
import EndOverlay from '../components/EndOverlay';
import type { Lesson } from '../core/theory/types';

interface Props {
  lesson: Lesson;
  hasNext: boolean;
  onCompleted: () => void;   // marca la lección como completada (persistencia)
  onNextLesson: () => void;
  onExit: () => void;
}

export default function LessonScreen({ lesson, hasNext, onCompleted, onNextLesson, onExit }: Props) {
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => { setI(0); setDone(false); }, [lesson]);

  const advance = () => {
    if (i + 1 >= lesson.steps.length) { setDone(true); onCompleted(); }
    else setI(i + 1);
  };

  const step = lesson.steps[i];
  const kbHeight = Math.max(90, Math.round(size.h * 0.24));
  const barH = 48;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: barH, display: 'flex', gap: 10, alignItems: 'center', padding: '0 12px' }}>
        <button className="btn-ghost" onClick={onExit} style={{ fontSize: 18 }}>✕</button>
        <div style={{ flex: 1, height: 8, background: 'var(--bg-chip)', borderRadius: 4 }}>
          <div style={{ width: `${((i + (done ? 1 : 0)) / lesson.steps.length) * 100}%`, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, var(--right-soft), var(--right))' }} />
        </div>
        <span className="chip">{Math.min(i + 1, lesson.steps.length)}/{lesson.steps.length}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {step.kind === 'teach' && <TeachStep step={step} width={size.w} kbHeight={kbHeight} onNext={advance} />}
        {step.kind === 'play' && <PlayStep step={step} width={size.w} kbHeight={kbHeight} onDone={advance} />}
        {step.kind === 'choose' && <ChooseStep step={step} onDone={advance} />}
      </div>
      {done && (
        <EndOverlay
          score={null} maxStreak={0} isRecord={false}
          onRepeat={hasNext ? onNextLesson : onExit}
          onChangeMode={onExit}
          onLibrary={onExit}
        />
      )}
    </div>
  );
}
