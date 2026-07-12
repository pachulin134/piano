import fs from 'node:fs';
import path from 'node:path';

const USER_DIR = path.resolve('public/songs/user');
const INDEX_PATH = path.join(USER_DIR, 'index.json');

function readIndex() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeIndex(entries) {
  fs.mkdirSync(USER_DIR, { recursive: true });
  fs.writeFileSync(INDEX_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

/** API de desarrollo: guarda .mid en disco para que todos los navegadores vean las mismas canciones. */
export function songApiPlugin() {
  return {
    name: 'song-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';

        if (req.method === 'POST' && url === '/api/songs') {
          try {
            const body = JSON.parse((await readBody(req)).toString('utf8'));
            const { id, title, midi } = body;
            if (!id || !title || !midi) {
              sendJson(res, 400, { error: 'Faltan id, title o midi' });
              return;
            }
            const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
            if (!safeId) {
              sendJson(res, 400, { error: 'Id inválido' });
              return;
            }

            fs.mkdirSync(USER_DIR, { recursive: true });
            const file = `${safeId}.mid`;
            fs.writeFileSync(path.join(USER_DIR, file), Buffer.from(midi, 'base64'));

            const index = readIndex().filter(e => e.id !== safeId);
            index.push({ id: safeId, file, title });
            writeIndex(index);

            sendJson(res, 200, { ok: true });
          } catch (err) {
            sendJson(res, 500, { error: err instanceof Error ? err.message : 'Error al guardar' });
          }
          return;
        }

        const deleteMatch = url.match(/^\/api\/songs\/([^/?]+)$/);
        if (req.method === 'DELETE' && deleteMatch) {
          try {
            const id = decodeURIComponent(deleteMatch[1]);
            const index = readIndex();
            const entry = index.find(e => e.id === id);
            if (!entry) {
              sendJson(res, 404, { error: 'Canción no encontrada' });
              return;
            }
            writeIndex(index.filter(e => e.id !== id));
            const filePath = path.join(USER_DIR, entry.file);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            sendJson(res, 200, { ok: true });
          } catch (err) {
            sendJson(res, 500, { error: err instanceof Error ? err.message : 'Error al borrar' });
          }
          return;
        }

        next();
      });
    },
  };
}
