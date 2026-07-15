export interface StepTeach { kind: 'teach'; text: string; keys: number[]; play?: boolean }
export interface StepPlay { kind: 'play'; text: string; keys: number[]; anyOctave?: boolean }
export interface StepChoose { kind: 'choose'; text: string; options: string[]; answer: number }
export type LessonStep = StepTeach | StepPlay | StepChoose;

export interface Lesson { id: string; title: string; steps: LessonStep[] }
export interface Level { id: string; index: number; title: string; subtitle: string; lessons: Lesson[] }
