/** UUID en navegador; fallback aleatorio donde no exista crypto (p. ej. tests en Node 18). */
export function uid(): string {
  return globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);
}
