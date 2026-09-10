#!/bin/zsh
cd "${0:A:h}"
if ! command -v node >/dev/null 2>&1; then
  print 'Install Node.js 22.13 or later, then reopen this launcher.'
  read '?Press Return to close.'
  exit 1
fi
if curl -fsS http://localhost:4173/api/health >/dev/null 2>&1; then
  open http://localhost:4173
  exit 0
fi
if [[ ! -d node_modules ]]; then npm install || exit 1; fi
node server.mjs &
game_server_pid=$!
trap 'kill -TERM $game_server_pid 2>/dev/null' EXIT INT TERM
for attempt in {1..30}; do
  if curl -fsS http://localhost:4173/api/health >/dev/null 2>&1; then break; fi
  sleep 0.2
done
open http://localhost:4173
wait $game_server_pid
