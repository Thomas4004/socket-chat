# Prompt: Chat locale con Socket.io per USI Marketplace

## Contesto

Sto sviluppando la parte **chat backend** di "USI Marketplace", un marketplace per studenti e staff dell'università USI (compravendita di oggetti e tutoring). Ogni conversazione è tra **un acquirente e un venditore**, legata a un **annuncio**.

Non ho mai usato Socket.io né i WebSocket: voglio **capire come funzionano**, non solo ottenere codice funzionante. Per questo ti chiedo di spiegare ogni parte in modo semplice.

## Obiettivo

Creare un **sito web locale** (gira solo sul mio computer, `localhost`) con una chat in tempo reale basata su **Socket.io**, da usare come base per il progetto vero.

## Stack richiesto

- **Node.js + Express** (server HTTP)
- **Socket.io** (comunicazione in tempo reale)
- **SQLite** (con `better-sqlite3`) per salvare i messaggi: nessuna installazione di database esterni
- **Frontend semplice**: HTML + CSS + JavaScript puro (nessun framework), servito da Express dalla cartella `public/`
- Niente Docker, niente cloud: tutto in locale con `npm install` e `node server.js`

## Concetti che il codice deve rispettare

1. **Eventi con nome**: il client fa `socket.emit("send_message", ...)`, il server ascolta con `socket.on(...)` e risponde con `io.to(roomId).emit("new_message", ...)`.
2. **Rooms (stanze)**: ogni chat ha un `roomId` nel formato `chat_<idAnnuncio>_<idCompratore>`. Quando un utente apre una chat fa `join_room` e il server esegue `socket.join(roomId)`. I messaggi arrivano **solo** a chi è nella stanza.
3. **Persistenza**: i socket sono solo il "tubo". Il server **salva ogni messaggio nel database prima** di inoltrarlo alla stanza.
4. **Storico**: quando un utente apre una chat, il client carica i messaggi precedenti con una normale richiesta HTTP `GET /api/messages/:roomId`, poi riceve quelli nuovi via socket.
5. **Autenticazione simulata**: poiché in locale non ho ancora NextAuth, crea una schermata iniziale dove scelgo uno username finto (es. "marco", "giulia"). Il server lo verifica nel middleware `io.use(...)` all'handshake e lo associa a `socket.data.user`. Il server deve usare **questo** username come mittente (mai fidarsi del mittente inviato dal client).
6. **Media (foto/video/audio)**: NON passano dentro il socket. Si caricano con una richiesta HTTP `POST /api/upload` (usa `multer`, salva in `public/uploads`), che restituisce un URL. Poi nel socket si invia solo `{ tipo: "image", url: "..." }`. I tipi di messaggio sono: `text`, `image`, `video`, `audio`.

## Funzionalità da implementare (in quest'ordine)

Procedi **a step**, e alla fine di ogni step fermati e dimmi come testarlo.

### Step 1: Chat minimale
Server Express + Socket.io, una pagina HTML con un campo di testo. Due schede del browser aperte devono scambiarsi messaggi in tempo reale. Nessun database, nessuna stanza.

### Step 2: Rooms
Aggiungi le stanze. Una schermata permette di scegliere un annuncio (finto) e un compratore, genera il `roomId` ed entra nella chat. Verifica che i messaggi non "escano" dalla stanza.

### Step 3: Database
Crea le tabelle SQLite e salva i messaggi. Schema suggerito:

```
messages(id, room_id, sender, type, content, created_at)
```

Dove `content` è il testo oppure l'URL del media. Aggiungi `GET /api/messages/:roomId` per lo storico.

### Step 4: Autenticazione simulata
Schermata di login con username finto + middleware `io.use(...)`.

### Step 5: Media e note vocali
- Upload di foto e video tramite `POST /api/upload`
- Registrazione di note vocali nel browser con l'API **HTML5 MediaRecorder**, poi upload e invio dell'URL
- Mostra nella chat `<img>`, `<video controls>` e `<audio controls>` a seconda del tipo

### Step 6 (extra, se c'è tempo)
- Indicatore "sta scrivendo..." (evento `typing`)
- Stato online/offline degli utenti
- Messaggio di sistema quando qualcuno entra nella stanza

## Struttura del progetto attesa

```
chat-locale/
├── package.json
├── server.js
├── db.js
├── chat.db            (generato automaticamente)
└── public/
    ├── index.html
    ├── style.css
    ├── client.js
    └── uploads/
```

## Regole per la tua risposta

- Scrivi tutto il codice **commentato in italiano**, spiegando *perché* si fa ogni cosa, soprattutto le righe con `emit`, `on`, `join` e `io.use`.
- Per ogni step, prima spiega in 3-4 righe cosa stiamo costruendo e quale concetto di Socket.io viene usato, poi mostra il codice.
- Mantieni il codice semplice e leggibile, evita astrazioni inutili: deve essere facile da capire per chi non ha mai usato i socket.
- Indica sempre i comandi da lanciare (`npm install ...`, `node server.js`) e come testare, ad esempio aprendo due schede del browser con utenti diversi.
- Non passare allo step successivo finché non ti dico che quello corrente funziona.
- Se una scelta ha delle alternative, dimmi brevemente quale hai scelto e perché.

## Nota per il futuro

Questo prototipo servirà da base per integrarlo nel progetto vero (Next.js + NextAuth + Prisma). Ricordami, quando sarà il momento, che **Vercel non supporta connessioni WebSocket persistenti**, quindi il server della chat andrà tenuto come servizio Node separato (o in Docker).
