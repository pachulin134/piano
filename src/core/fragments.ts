import { groupNotes } from './groupNotes';
import type { Song } from './types';

export interface Fragment {
  index: number;
  start: number;
  end: number;
}

const TARGET_FRAGMENT_SECONDS = 11;
const MIN_SONG_DURATION_TO_SPLIT = 20;
const MIN_BOUNDARY_GAP = 2; // separación mínima entre límites, evita fragmentos degenerados

/**
 * Trocea una canción en fragmentos cortos (~11s) para practicar por partes.
 * No depende del compás (robusto para cualquier tiempo, incluidos los valses
 * en 3/4 del catálogo): los límites internos se ajustan al inicio de la nota
 * más cercana, para no cortar nunca a mitad de un silencio o de un acorde.
 * Canciones cortas (< 20s) o sin notas devuelven un único fragmento.
 */
export function splitIntoFragments(song: Song): Fragment[] {
  if (song.duration < MIN_SONG_DURATION_TO_SPLIT || song.notes.length === 0) {
    return [{ index: 0, start: 0, end: song.duration }];
  }

  const onsets = groupNotes(song.notes).map(g => g.time);
  const targetCount = Math.max(1, Math.round(song.duration / TARGET_FRAGMENT_SECONDS));
  const boundaries: number[] = [0];

  for (let i = 1; i < targetCount; i++) {
    const targetTime = (song.duration / targetCount) * i;
    let nearest = onsets[0];
    let bestDist = Math.abs(onsets[0] - targetTime);
    for (const t of onsets) {
      const d = Math.abs(t - targetTime);
      if (d < bestDist) { bestDist = d; nearest = t; }
    }
    if (nearest > boundaries[boundaries.length - 1] + MIN_BOUNDARY_GAP) {
      boundaries.push(nearest);
    }
  }
  boundaries.push(song.duration);

  const fragments: Fragment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    fragments.push({ index: i, start: boundaries[i], end: boundaries[i + 1] });
  }
  return fragments.length > 0 ? fragments : [{ index: 0, start: 0, end: song.duration }];
}
