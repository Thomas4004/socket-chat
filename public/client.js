// ============================================================
// STEP 1 - Client della chat
// ------------------------------------------------------------
// Il client si connette al server Socket.io e:
//  - invia i messaggi con socket.emit("send_message", ...)
//  - riceve i messaggi con socket.on("new_message", ...)
// ============================================================

// "io()" apre la connessione WebSocket verso lo stesso host
// che ha servito la pagina (localhost:3000). Restituisce un
// oggetto "socket" che useremo per emit/on.
const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("input");
const messages = document.getElementById("messages");

// Quando l'utente invia il form (preme Invio o clicca "Invia")
form.addEventListener("submit", (e) => {
  e.preventDefault(); // evita il reload della pagina
  const text = input.value.trim();
  if (!text) return;

  // "emit" invia un evento al server. Il primo argomento è il
  // nome dell'evento, il secondo è il payload (qui una stringa).
  socket.emit("send_message", text);

  input.value = "";
});

// "on" ascolta un evento inviato dal server. Ogni volta che
// arriva "new_message" aggiungiamo una riga alla lista.
socket.on("new_message", (text) => {
  const div = document.createElement("div");
  div.className = "message";
  div.textContent = text;
  messages.appendChild(div);
  // Scroll automatico in fondo per vedere l'ultimo messaggio
  messages.scrollTop = messages.scrollHeight;
});
