// ============================================================
// STEP 1 - Chat minimale con Socket.io
// ------------------------------------------------------------
// Obiettivo: due schede del browser aperte devono scambiarsi
// messaggi in tempo reale. Niente database, niente stanze.
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

  // Ascoltiamo l'evento "send_message" inviato dal client.
  // Il nome dell'evento è arbitrario: deve solo combaciare
  // tra client (emit) e server (on).
  socket.on("send_message", (data) => {
    console.log("Messaggio ricevuto:", data);

    // "io.emit" manda l'evento a TUTTI i client connessi,
    // incluso chi ha inviato il messaggio. In Step 2 lo
    // sostituiremo con io.to(roomId).emit(...) per limitarlo
    // alla stanza giusta.
    io.emit("new_message", data);
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
