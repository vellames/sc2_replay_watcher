# SC2 Replay Watcher

A full-stack MVP that transforms `.SC2Replay` files into an interactive 2D tactical view. The
frontend handles uploads, timeline playback, and unit inspection; the backend compiles replays into
world states with `sc2_world_engine`.

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Python, FastAPI, `sc2_world_engine`

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
```

The API runs at `http://localhost:8010`, with interactive documentation at
`http://localhost:8010/docs`.

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The home page sends the replay to FastAPI, which compiles it with the
versioned `sc2_world_engine` dependency. The backend adapts the validated `.sc2world` archive to the
watcher contract; the frontend only plays and renders the resulting states. After processing, the
app navigates to `/watcher`, which contains the map, timeline, and playback controls.

The interface is available in English and Portuguese. The `PT / EN` selector is in the header and
stores the selected language in the browser.

## StarCraft II presentation layer

Unit, structure, and upgrade names, aliases, states, and visual roles are centralized in
`frontend/src/lib/sc2-catalog.ts`. UI code must not translate raw replay identifiers directly:

- `sc2Name` provides localized names with a readable fallback for future content;
- `canonicalSc2Type` groups transient forms in composition views, such as burrowed, flying, and
  siege-mode variants;
- `sc2StateName` preserves the transient form as a detail in inspectors and hover states;
- `sc2IconKey` keeps tactical silhouettes consistent across the map, HUD, production views, and
  responsive drawer.

When adding an entity, add its alias to the catalog and a case to `sc2-catalog.test.ts`. Validate
the frontend, catalog, and production build with:

```bash
cd frontend
npm test
npm run lint
npm run build
```

Metrics that are reconstructed or inferred must be labeled accordingly in tooltips. Do not present
health, shields, or any state absent from the replay as factual telemetry.

## Sample replay

Use `samples/HSC-XXIX-Grand-Final-G4-2026.SC2Replay`. It is game 4 of the HomeStory Cup XXIX Grand
Final between Serral and Clem, a 34:24 match played on version 5.0.16.97425. Provenance, match
details, and the checksum are documented in `samples/README.md`.

## Current limitations

The replay format records position samples only for certain events. Movement between samples is
therefore a visual approximation marked as `estimated`, not an exact reconstruction of the
StarCraft II simulation. Detailed terrain rendering, vision, and physics remain out of scope.

The watcher displays supply, bank, composition, army value, income, player deltas, losses,
production, and synchronized build paths. The timeline separates technology, macro, movement, and
combat events; shows supply-block and engagement intervals; and plots military-advantage history.
Engagements are interactive and expose mineral, gas, supply, and unit losses alongside estimated
trade efficiency.

The map supports layer filters, zoom and pan, semantic grouping of armies and bases, combat
activity, movement destinations, and position confidence. Player cameras can be isolated. When the
camera layer is active, the HUD shows a derived attention rhythm without presenting it as APM.

Watcher shortcuts:

- `Space`: play or pause;
- `←` / `→`: move backward or forward 5 seconds;
- `Shift` + `←` / `→`: move backward or forward 1 second;
- `[` / `]`: jump to the previous or next relevant analytical event;
- `Home` / `End`: jump to the beginning or end of the replay;
- `Escape`: close the inspector.

Repeated uploads with identical content reuse a small SHA-256-keyed LRU cache. Heavy compilation
runs outside the API event loop.

When a replay contains an available `.s2ma` depot reference, the world engine builds a static
bootstrap containing terrain levels, cliffs, ramps, and destructible blockers. The watcher renders
this geometry before frame zero and uses the official minimap only as a reference asset. If the map
is unavailable or the download fails, the response falls back to a procedural scene without
interrupting replay playback.

When these terrain layers are present, estimated ground movement uses a walkable mesh with
clearance and shared A* corridors. Flying units continue in straight lines, and the pathfinder never
replaces tracker-recorded positions.

Player cameras use the original `CameraEvent` samples. The watcher holds the latest recorded
position until the next sample and never interpolates coordinates between camera events.

## License

Source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE).
Noncommercial research, education, personal study, and hobby use are permitted. Commercial use is
not permitted without a separate license from the copyright holder.

The bundled replay fixture is third-party material and is not licensed under PolyForm. See
[`samples/README.md`](samples/README.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

StarCraft II and related assets are trademarks or copyrighted materials of Blizzard
Entertainment. This project is an independent community tool and is not affiliated with or
endorsed by Blizzard Entertainment.
