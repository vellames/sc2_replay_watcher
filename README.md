# SC2 Replay Watcher

MVP full-stack que transforma arquivos `.SC2Replay` em uma visualização tática 2D. O frontend oferece upload, reprodução da linha do tempo e inspeção das unidades; o backend compila o replay em estados do mundo com a `sc2_world_engine`.

## Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Python, FastAPI, `sc2_world_engine`

## Rodando localmente

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
```

A API fica em `http://localhost:8010` e a documentação em `http://localhost:8010/docs`.

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Abra `http://localhost:3000`. A página inicial envia o replay ao FastAPI, que o compila com o projeto independente `../sc2_world_engine`. O backend adapta o `.sc2world` validado para o contrato do watcher; o frontend apenas reproduz e renderiza os estados recebidos. Depois do processamento, o app navega para `/watcher`, onde ficam mapa, timeline e controles.

A interface está disponível em português e inglês. O seletor `PT / EN` fica no cabeçalho e salva a preferência no navegador.

## Camada de apresentação do SC2

Nomes, aliases, estados e papéis visuais de unidades, estruturas e upgrades ficam centralizados em
`frontend/src/lib/sc2-catalog.ts`. A UI nunca deve traduzir identificadores do replay diretamente:

- `sc2Name` fornece o nome localizado e mantém fallback legível para conteúdo futuro;
- `canonicalSc2Type` agrupa formas transitórias na composição (enterrado, voando, modo de cerco);
- `sc2StateName` preserva essa forma como detalhe no inspector e no hover;
- `sc2IconKey` garante a mesma silhueta tática no mapa, HUD, produção e drawer responsivo.

Ao incluir uma entidade, adicione o alias ao catálogo e um caso em `sc2-catalog.test.ts`. Para validar
frontend, catálogo e build de produção:

```bash
cd frontend
npm test
npm run lint
npm run build
```

Métricas reconstruídas ou inferidas precisam ser descritas como tal nos tooltips. Não apresente vida,
escudo ou outro estado que o replay não registre como se fosse telemetria factual.

## Replay de exemplo

Use `samples/HSC-XXIX-Grand-Final-G4-2026.SC2Replay`. É o jogo 4 da Grand Final da HomeStory Cup XXIX: Serral vs Clem, uma partida de 34:24 jogada na versão 5.0.16.97425. A origem, os detalhes e o checksum estão documentados em `samples/README.md`.

## Limitações atuais

O formato de replay registra apenas amostras de posição em determinados eventos. Por isso, o movimento entre amostras é uma aproximação visual marcada como `estimated`, não uma reconstrução exata do motor do jogo. Terreno, visão e física detalhada ficam fora do escopo atual.

O watcher exibe supply, banco, composição e valor do exército, renda, deltas entre jogadores,
perdas, produção e build path sincronizado. A timeline separa tech, macro, movimentos e combates,
mostra intervalos de supply block/confronto e plota o histórico da vantagem militar. Confrontos são
clicáveis e abrem perdas de mineral, gás, supply, unidades e eficiência estimada da troca.

O mapa possui filtros de camadas, zoom/pan, agrupamento semântico de exércitos, bases, atividade de
combate, destinos e confiança das posições. As câmeras podem ser isoladas por jogador e, quando a
camada está ativa, o HUD mostra ritmo derivado de atenção sem tratá-lo como APM.

Atalhos do watcher:

- `Space`: play/pause;
- `←` / `→`: voltar/avançar 5 segundos;
- `Shift` + `←` / `→`: voltar/avançar 1 segundo;
- `[` / `]`: evento analítico relevante anterior/seguinte;
- `Home` / `End`: início/fim do replay;
- `Escape`: fechar o inspector.

Uploads repetidos com o mesmo conteúdo reutilizam um cache LRU pequeno identificado pelo SHA-256;
a compilação pesada roda fora do event loop da API.

Quando a referência `.s2ma` do replay está disponível no depot da Blizzard, a world engine monta um
bootstrap estático com níveis do terreno, cliffs, rampas e bloqueios destrutíveis. O watcher desenha
essa geometria antes do frame zero e usa o minimapa oficial apenas como asset de referência. Se o mapa
não estiver disponível ou o download falhar, a resposta usa o cenário procedural sem interromper a
leitura do replay.

Quando essas camadas estão presentes, movimentos terrestres estimados usam uma malha caminhável com
clearance e corredores A* compartilhados por comando. Unidades voadoras continuam em linha direta e
posições registradas pelo tracker nunca são substituídas pelo pathfinder.

As câmeras dos jogadores usam as amostras originais de `CameraEvent`: o watcher mantém a última
posição registrada até a próxima amostra e nunca interpola coordenadas entre dois eventos.
