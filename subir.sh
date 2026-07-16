#!/bin/bash
# Sube los cambios del Piano Trainer a GitHub (y Vercel se actualiza solo si está conectado).
cd "$(dirname "$0")"
git config credential.helper store   # recuerda la llave tras la primera vez
git push origin main && echo "✅ Subido a GitHub. Si Vercel está conectado, la web se actualiza sola en ~1 minuto."
