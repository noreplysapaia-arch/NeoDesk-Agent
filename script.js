// ---------------------------------------------------------------------------
// CONFIG: point this at your deployed backend (Render/Railway/etc.)
// Example: "https://neodesk-backend.onrender.com"
// ---------------------------------------------------------------------------
const BACKEND_URL = "http://localhost:5000";

const GREETING = "আসসালামু আলাইকুম! আমি Neodesk থেকে রিমি বলছি। আমি কি তানভীর আহমেদ সাহেবের সাথে কথা বলছি?";

const chatLog = document.getElementById("chatLog");
const composerForm = document.getElementById("composerForm");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const callTimer = document.getElementById("callTimer");

// history: [{role: "agent" | "customer", text: "..."}]
let history = [];

function addBubble(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
  return bubble;
}

function showTyping() {
  const bubble = document.createElement("div");
  bubble.className = "bubble agent typing";
  bubble.innerHTML = "<span></span><span></span><span></span>";
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
  return bubble;
}

async function sendToBackend(message) {
  const response = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `সার্ভার এরর: ${response.status}`);
  }

  const data = await response.json();
  return data.reply;
}

composerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  addBubble("customer", text);
  history.push({ role: "customer", text });
  messageInput.value = "";
  messageInput.disabled = true;
  sendBtn.disabled = true;

  const typingBubble = showTyping();

  try {
    const reply = await sendToBackend(text);
    typingBubble.remove();
    addBubble("agent", reply);
    history.push({ role: "agent", text: reply });
  } catch (err) {
    typingBubble.remove();
    addBubble("agent", `দুঃখিত, একটা সমস্যা হয়েছে: ${err.message}`);
  } finally {
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
});

// Simple call-duration timer, purely cosmetic
let seconds = 0;
setInterval(() => {
  seconds += 1;
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  callTimer.textContent = `${m}:${s}`;
}, 1000);

// Kick off the call with the agent's opening line
window.addEventListener("DOMContentLoaded", () => {
  addBubble("agent", GREETING);
  history.push({ role: "agent", text: GREETING });
});
