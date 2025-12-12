# Pokedex React

Pokedex em React + Vite + Tailwind com filtros avancados, busca por imagem, modos de batalha PvE/PvP e cache em Firebase para carregamento rapido.

## Web
<img width="1903" height="875" alt="image" src="https://github.com/user-attachments/assets/e9ff1b6b-ba0a-4f09-9c02-e26fbe0449f8" />

## Mobile
<img width="383" height="851" alt="image" src="https://github.com/user-attachments/assets/7846f545-4420-44a4-b1f8-6e92ca9b03e1" />

## Novidades do game
- Busca por imagem: upload ou camera com TensorFlow/MobileNet e matching por similaridade; leva direto para o Pokemon encontrado.
- Modo Batalha renovado: PvE rapido e PvP online com calculo de dano (tabela de tipos, STAB e bonus de clima) e log das jogadas.
- PvP online: login Google, presenca em tempo real, lista de jogadores, convites, rematch, filtro por regiao para sorteio, e modos Classico ou Cartas (melhor de 3/5) com comparacao de atributos.
- Cache da Pokedex no Firebase Realtime Database para carregar 1000+ Pokemon sem esperar a API a cada abertura.
- Favoritos persistentes no navegador e sincronizados com a sua conta quando logado.
- Tema claro/escuro e navegacao mobile fixa no rodape.

## Funcionalidades
- Busca por nome, numero ou tipo; atalhos para favoritos ao digitar "fav" ou "lik".
- Filtro por tipo e geracao com badges, mais paginacao (151 por pagina).
- Busca por imagem com camera/upload (TensorFlow) integrada a navegacao.
- Cards com estilo vitreos, icones de tipo e badges de geracao.
- Pagina de detalhes com stats, habilidades e primeiros golpes.
- Paginas de Tipos (com contagem + lendarios/miticos) e Regioes/Geracoes.
- Favoritos com toggle no card (local + Firebase).
- Tema claro/escuro lembrado no dispositivo.

## Requisitos
- Node.js 18+
- npm

## Instalacao
```bash
npm install
```

## Rodar em desenvolvimento
```bash
npm run dev
```
Abra `http://localhost:5173`.

## Build de producao
```bash
npm run build
```

## Preview da build
```bash
npm run preview
```

## Configurar o Firebase
1) Crie um projeto no Firebase Console, adicione um app Web e copie as credenciais.
2) Ative Authentication > Google e Realtime Database (modo Production; crie regras conforme sua necessidade).
3) Substitua o objeto `firebaseConfig` em `src/lib/firebase.js` pelos dados do seu projeto:
```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "...",
};
```
4) Estruturas usadas no Realtime Database:
   - `pokemon/` para cache da Pokedex.
   - `favorites/{uid}` para favoritos sincronizados.
   - `presence/`, `invites/` e `rooms/` para lobby e partidas PvP.

## Estrutura
- `src/components/` - Header, filtros, cards, busca por imagem etc.
- `src/pages/` - Home, Types, Generations, Battle, Favorites, Detail.
- `src/hooks/` - Autenticacao e store de favoritos.
- `src/lib/` - Firebase e cache da Pokedex.
- `public/` - Assets estaticos.

## Scripts
- `npm run dev` - Desenvolver.
- `npm run build` - Build de producao.
- `npm run preview` - Preview da build.
