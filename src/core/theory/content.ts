import type { Level } from './types';

export const LEVELS: Level[] = [
  {
    id: 'n1', index: 1, title: 'Conoce el teclado',
    subtitle: 'blancas, negras y los nombres de las notas',
    lessons: [
      { id: 'n1l1', title: 'Blancas y negras', steps: [
        { kind: 'teach', text: 'El piano tiene teclas blancas y teclas negras. Las negras van en grupos de 2 y de 3, y ese dibujo se repite por todo el teclado.', keys: [61, 63, 66, 68, 70] },
        { kind: 'choose', text: '¿En qué grupos se colocan las teclas negras?', options: ['De 2 y de 3', 'Todas seguidas', 'De 4 en 4'], answer: 0 },
      ]},
      { id: 'n1l2', title: 'Encuentra el Do', steps: [
        { kind: 'teach', text: 'El DO es la tecla blanca justo a la izquierda del grupo de 2 negras. Escúchalos: hay varios DO por el teclado.', keys: [48, 60, 72], play: true },
        { kind: 'play', text: 'Toca un DO (el que quieras).', keys: [60], anyOctave: true },
        { kind: 'choose', text: 'El DO está a la izquierda del grupo de…', options: ['2 negras', '3 negras'], answer: 0 },
      ]},
      { id: 'n1l3', title: 'Re, Mi y el grupo de 2', steps: [
        { kind: 'teach', text: 'Dentro del grupo de 2 negras: a la izquierda el DO, en medio el RE, y a la derecha el MI.', keys: [60, 62, 64], play: true },
        { kind: 'play', text: 'Toca un RE.', keys: [62], anyOctave: true },
        { kind: 'play', text: 'Ahora toca un MI.', keys: [64], anyOctave: true },
      ]},
      { id: 'n1l4', title: 'Fa, Sol, La, Si y el grupo de 3', steps: [
        { kind: 'teach', text: 'El grupo de 3 negras empieza en FA. Las blancas son FA, SOL, LA, SI. Después vuelve el DO.', keys: [65, 67, 69, 71], play: true },
        { kind: 'play', text: 'Toca un FA (a la izquierda del grupo de 3).', keys: [65], anyOctave: true },
        { kind: 'play', text: 'Toca un SOL.', keys: [67], anyOctave: true },
        { kind: 'choose', text: '¿Cuántas notas blancas hay antes de repetirse (Do a Si)?', options: ['5', '7', '8'], answer: 1 },
      ]},
      { id: 'n1l5', title: 'Octavas: agudo y grave', steps: [
        { kind: 'teach', text: 'De un DO al siguiente DO hay una OCTAVA. A la derecha el sonido es más AGUDO; a la izquierda, más GRAVE.', keys: [48, 60, 72], play: true },
        { kind: 'play', text: 'Toca el DO más agudo que veas.', keys: [72] },
        { kind: 'play', text: 'Toca el DO más grave que veas.', keys: [48] },
        { kind: 'choose', text: 'A la derecha del teclado el sonido es…', options: ['Más grave', 'Más agudo'], answer: 1 },
      ]},
    ],
  },
  {
    id: 'n2', index: 2, title: 'Ritmo y pulso',
    subtitle: 'la duración de las notas y el compás',
    lessons: [
      { id: 'n2l1', title: 'El pulso', steps: [
        { kind: 'teach', text: 'La música tiene un PULSO regular, como los pasos al andar. Sobre ese pulso colocamos las notas.', keys: [60] },
        { kind: 'play', text: 'Toca un DO cuatro veces, marcando un pulso regular.', keys: [60], anyOctave: true },
        { kind: 'choose', text: 'El pulso es…', options: ['Un latido regular', 'El nombre de una tecla'], answer: 0 },
      ]},
      { id: 'n2l2', title: 'Negra, blanca y redonda', steps: [
        { kind: 'teach', text: 'La NEGRA dura 1 pulso, la BLANCA 2 y la REDONDA 4. Cuanto más larga, más suena la nota.', keys: [60] },
        { kind: 'choose', text: '¿Qué dura más?', options: ['La negra', 'La blanca', 'La redonda'], answer: 2 },
        { kind: 'choose', text: 'Una blanca dura…', options: ['1 pulso', '2 pulsos', '4 pulsos'], answer: 1 },
      ]},
      { id: 'n2l3', title: 'Los silencios', steps: [
        { kind: 'teach', text: 'Los SILENCIOS son pausas: momentos sin tocar que también tienen duración. La música también respira.', keys: [] as number[] },
        { kind: 'choose', text: 'Un silencio es…', options: ['Una nota muy grave', 'Una pausa sin tocar'], answer: 1 },
      ]},
      { id: 'n2l4', title: 'El compás de 4/4', steps: [
        { kind: 'teach', text: 'El COMPÁS agrupa los pulsos. En 4/4 hay 4 pulsos por compás; es el más común en las canciones.', keys: [60] },
        { kind: 'play', text: 'Marca un compás de 4/4: toca un DO 4 veces.', keys: [60], anyOctave: true },
        { kind: 'choose', text: 'En 4/4 hay… pulsos por compás.', options: ['2', '3', '4'], answer: 2 },
      ]},
    ],
  },
  {
    id: 'n3', index: 3, title: 'Sostenidos y bemoles',
    subtitle: 'las teclas negras tienen nombre',
    lessons: [
      { id: 'n3l1', title: 'Semitono y tono', steps: [
        { kind: 'teach', text: 'De una tecla a la de justo al lado (contando negras) hay un SEMITONO, la distancia más pequeña. Dos semitonos son un TONO.', keys: [60, 61, 62], play: true },
        { kind: 'choose', text: 'La distancia más pequeña entre dos teclas es…', options: ['Un tono', 'Un semitono'], answer: 1 },
      ]},
      { id: 'n3l2', title: 'El sostenido (#)', steps: [
        { kind: 'teach', text: 'Subir un semitono es un SOSTENIDO (#). La negra a la derecha del DO es DO# (do sostenido).', keys: [60, 61], play: true },
        { kind: 'play', text: 'Toca el DO# (la negra a la derecha del DO).', keys: [61], anyOctave: true },
      ]},
      { id: 'n3l3', title: 'El bemol (♭)', steps: [
        { kind: 'teach', text: 'Bajar un semitono es un BEMOL (♭). Esa misma negra, vista desde el RE, es RE♭. ¡La misma tecla tiene dos nombres!', keys: [62, 61], play: true },
        { kind: 'choose', text: 'DO# y RE♭ son…', options: ['La misma tecla', 'Teclas distintas'], answer: 0 },
      ]},
      { id: 'n3l4', title: 'Las 5 negras', steps: [
        { kind: 'teach', text: 'Las negras son DO#, RE#, FA#, SOL# y LA#. Fíjate: no hay negra entre MI-FA ni entre SI-DO.', keys: [61, 63, 66, 68, 70], play: true },
        { kind: 'play', text: 'Toca el FA# (la primera negra del grupo de 3).', keys: [66], anyOctave: true },
        { kind: 'choose', text: '¿Entre qué notas NO hay tecla negra?', options: ['Entre MI y FA', 'Entre DO y RE'], answer: 0 },
      ]},
    ],
  },
];
