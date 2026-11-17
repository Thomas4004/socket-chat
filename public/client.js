// ============================================================
// STEP 2 - Client della chat con stanze
// ------------------------------------------------------------
// 1. L'utente sceglie annuncio + compratore nella lobby.
// 2. Costruiamo il roomId "chat_<annuncio>_<compratore>".
// 3. Emettiamo "join_room" per entrare nella stanza.
// 4. I messaggi vengono inviati con { roomId, text } e il
//    server li inoltra solo a chi è nella stessa stanza.
// ============================================================

// "io()" apre la connessione WebSocket verso lo stesso host
// che ha servito la pagina (localhost:3000).
const socket = io();

// Riferimenti agli elementi della pagina
const lobby = document.getElementById("lobby");
const chat = document.getElementById("chat");
const roomLabel = document.getElementById("room-label");
const listingSelect = document.getElementById("listing");
const buyerSelect = document.getElementById("buyer");
const enterBtn = document.getElementById("enter");
const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

// Variabile che tiene traccia della stanza corrente del client.
// Ci serve per inviare i messaggi con il roomId giusto.
let currentRoom = null;

// ------------------------------------------------------------
// ENTRARE NELLA STANZA
// ------------------------------------------------------------
enterBtn.addEventListener("click", () => {
  // Costruiamo il roomId nel formato concordato.
  const listingId = listingSelect.value;
  const buyerId = buyerSelect.value;
  const roomId = `chat_${listingId}_${buyerId}`;

  // Chiediamo al server di farci entrare nella stanza.
  // Il server risponde con "room_joined" quando il join è
  // andato a buon fine.
  socket.emit("join_room", roomId);
});

// Il server ci conferma che siamo entrati: ora possiamo
// mostrare la chat e nascondere la lobby.
socket.on("room_joined", async (roomId) => {
  currentRoom = roomId;
  roomLabel.textContent = roomId;
  lobby.hidden = true;
  chat.hidden = false;
  messages.innerHTML = ""; // puliamo eventuali messaggi vecchi
  input.focus();

  // Carichiamo lo STORICO via HTTP normale (non socket).
  // I messaggi nuovi arriveranno poi con "new_message".
  try {
    const res = await fetch(`/api/messages/${roomId}`);
    if (!res.ok) throw new Error("Errore HTTP " + res.status);
    const history = await res.json();
    history.forEach(renderMessage);
  } catch (err) {
    console.error("Errore caricamento storico:", err);
  }
});

// Se il server rifiuta il roomId (es. formato sbagliato)
socket.on("error_message", (msg) => {
  alert(msg);
});

// ------------------------------------------------------------
// INVIARE UN MESSAGGIO
// ------------------------------------------------------------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || !currentRoom) return;

  // Inviamo al server il roomId insieme al testo: il server
  // userà il roomId per inoltrare il messaggio SOLO a chi è
  // in quella stanza.
  socket.emit("send_message", { roomId: currentRoom, text });

  input.value = "";
});

// ------------------------------------------------------------
// RICEVERE UN MESSAGGIO
// ------------------------------------------------------------
// Arrivano solo i messaggi della stanza in cui siamo: il
// server usa io.to(roomId).emit(...), non io.emit(...).
// Il payload ora è l'oggetto salvato nel DB:
// { id, roomId, sender, type, content, createdAt }.
socket.on("new_message", renderMessage);

// Funzione condivisa per mostrare un messaggio (usata sia per
// lo storico che per i nuovi in tempo reale).
function renderMessage(msg) {
  const div = document.createElement("div");
  div.className = "message";

  // Per ora mostriamo solo testo. In Step 5 gestiremo image/
  // video/audio in base a msg.type.
  div.textContent = `${msg.sender}: ${msg.content}`;

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}
