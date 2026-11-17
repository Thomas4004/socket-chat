// ============================================================
// STEP 2 - Chat con stanze (rooms)
// ------------------------------------------------------------
// Obiettivo: i messaggi arrivano SOLO a chi è nella stessa
// stanza. Concetti nuovi: socket.join(roomId) e
// io.to(roomId).emit(...).
// ============================================================

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

// Creiamo l'app Express: serve solo a servire i file statici
// (HTML, CSS, JS) dalla cartella "public".
const app = express();
app.use(express.static(path.join(__dirname, "public")));

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
  socket.on("send_message", (data) => {
    const { roomId, text } = data || {};
    if (!roomId || !text) return;

    console.log(`Messaggio in ${roomId}:`, text);

    // In Step 3 salveremo qui il messaggio nel database PRIMA
    // di inoltrarlo. Per ora lo inoltriamo e basta.
    io.to(roomId).emit("new_message", { roomId, text });
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
