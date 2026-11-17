// ============================================================
// STEP 3 - Chat con stanze + persistenza su PostgreSQL
// ------------------------------------------------------------
// Concetto nuovo: i socket sono solo il "tubo" real-time.
// Ogni messaggio viene PRIMA salvato nel DB, POI inoltrato
// alla stanza. Lo storico si carica via HTTP normale.
// ============================================================

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const prisma = require("./db");

// Creiamo l'app Express: serve i file statici (HTML, CSS, JS)
// dalla cartella "public" e le API HTTP (storico messaggi).
const app = express();
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------------------------------
// API HTTP: storico messaggi di una stanza
// ------------------------------------------------------------
// Il client chiama GET /api/messages/chat_1_10 quando entra
// nella stanza, per mostrare i messaggi precedenti. I nuovi
// arriveranno poi via socket.
app.get("/api/messages/:roomId", async (req, res) => {
  const { roomId } = req.params;

  // Stessa validazione del socket: evitiamo query con input
  // arbitrario.
  if (!/^chat_\d+_\d+$/.test(roomId)) {
    return res.status(400).json({ error: "roomId non valido" });
  }

  try {
    // Ordiniamo per data crescente: i più vecchi in cima.
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
    });
    res.json(messages);
  } catch (err) {
    console.error("Errore caricamento storico:", err);
    res.status(500).json({ error: "errore interno" });
  }
});

// Socket.io NON è un server HTTP a sé: ha bisogno di un server
// HTTP a cui agganciarsi. Per questo creiamo un server HTTP
// "manuale" con http.createServer(app) e ci attacchiamo sopra
// Socket.io. Così Express e Socket.io condividono la stessa
// porta (3000) e lo stesso dominio.
const server = http.createServer(app);
const io = new Server(server);

// "io.on('connection', ...)" scatta OGNI VOLTA che un nuovo
// client si connette (cioè quando il browser esegue io()).
// Il parametro "socket" rappresenta QUELLA singola connessione.
io.on("connection", (socket) => {
  console.log("Nuovo client connesso:", socket.id);

  // ----------------------------------------------------------
  // ENTRARE IN UNA STANZA
  // ----------------------------------------------------------
  // Il client emette "join_room" con il roomId scelto.
  // "socket.join(roomId)" aggiunge QUESTO socket alla stanza.
  // Da quel momento, ogni io.to(roomId).emit(...) raggiungerà
  // anche lui. Un socket può stare in più stanze contemporaneamente.
  socket.on("join_room", (roomId) => {
    // Validazione minima: il roomId deve rispettare il formato
    // concordato "chat_<idAnnuncio>_<idCompratore>". Non è
    // sicurezza vera (arriverà con l'auth), ma evita errori
    // banali tipo stringhe vuote.
    if (typeof roomId !== "string" || !/^chat_\d+_\d+$/.test(roomId)) {
      socket.emit("error_message", "roomId non valido");
      return;
    }

    socket.join(roomId);
    console.log(`Socket ${socket.id} è entrato nella stanza ${roomId}`);

    // Confermiamo al client che è entrato: utile per mostrare
    // la chat solo dopo il join.
    socket.emit("room_joined", roomId);
  });

  // ----------------------------------------------------------
  // INVIARE UN MESSAGGIO IN UNA STANZA
  // ----------------------------------------------------------
  // Il client manda { roomId, text }. Il server NON usa io.emit
  // (che andrebbe a tutti), ma io.to(roomId).emit: solo chi è
  // in quella stanza riceve il messaggio.
  socket.on("send_message", async (data) => {
    const { roomId, text } = data || {};
    if (!roomId || !text) return;

    // Validazione del roomId anche qui: non ci fidiamo del client.
    if (!/^chat_\d+_\d+$/.test(roomId)) return;

    try {
      // 1) SALVIAMO PRIMA nel database. Se il salvataggio
      //    fallisce, non inoltriamo nulla: meglio perdere un
      //    messaggio in tempo reale che averlo "fantasma" in
      //    una scheda e non nel DB.
      //    In Step 4 sostituiremo "anonimo" con socket.data.user.
      const saved = await prisma.message.create({
        data: {
          roomId,
          sender: "anonimo",
          type: "text",
          content: text,
        },
      });

      // 2) POI inoltriamo alla stanza. Usiamo l'oggetto salvato
      //    così il client riceve anche id e createdAt.
      io.to(roomId).emit("new_message", saved);
    } catch (err) {
      console.error("Errore salvataggio messaggio:", err);
      socket.emit("error_message", "Impossibile inviare il messaggio");
    }
  });

  // Quando il client si disconnette (chiude la scheda, perde
  // la rete, ecc.) Socket.io emette "disconnect" da solo.
  socket.on("disconnect", () => {
    console.log("Client disconnesso:", socket.id);
  });
});

// Avvio del server sulla porta 3000.
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server in ascolto su http://localhost:${PORT}`);
});
