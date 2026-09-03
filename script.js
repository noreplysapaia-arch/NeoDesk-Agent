// ---------------------------------------------------------------------------
// CONFIG: point this at your deployed backend (Render/Railway/etc.)
// Example: "https://neodesk-backend.onrender.com"
// ---------------------------------------------------------------------------
const BACKEND_URL = "https://neodesk-agent.onrender.com";[span_1](start_span)[span_1](end_span)

const GREETING = "আসসালামু আলাইকুম! আমি Neodesk থেকে রিমি বলছি। আমি কি তানভীর আহমেদ সাহেবের সাথে কথা বলছি?";[span_2](start_span)[span_2](end_span)

const chatLog = document.getElementById("chatLog");[span_3](start_span)[span_3](end_span)
const composerForm = document.getElementById("composerForm");[span_4](start_span)[span_4](end_span)
const messageInput = document.getElementById("messageInput");[span_5](start_span)[span_5](end_span)
const sendBtn = document.getElementById("sendBtn");[span_6](start_span)[span_6](end_span)
const callTimer = document.getElementById("callTimer");[span_7](start_span)[span_7](end_span)

// history: [{role: "agent" | "customer", text: "..."}]
let history = [];[span_8](start_span)[span_8](end_span)

function addBubble(role, text) {[span_9](start_span)[span_9](end_span)
  const bubble = document.createElement("div");[span_10](start_span)[span_10](end_span)
  bubble.className = `bubble ${role}`;[span_11](start_span)[span_11](end_span)
  bubble.textContent = text;[span_12](start_span)[span_12](end_span)
  chatLog.appendChild(bubble);[span_13](start_span)[span_13](end_span)
  chatLog.scrollTop = chatLog.scrollHeight;[span_14](start_span)[span_14](end_span)
  return bubble;[span_15](start_span)[span_15](end_span)
}

function showTyping() {[span_16](start_span)[span_16](end_span)
  const bubble = document.createElement("div");[span_17](start_span)[span_17](end_span)
  bubble.className = "bubble agent typing";[span_18](start_span)[span_18](end_span)
  bubble.innerHTML = "<span></span><span></span><span></span>";[span_19](start_span)[span_19](end_span)
  chatLog.appendChild(bubble);[span_20](start_span)[span_20](end_span)
  chatLog.scrollTop = chatLog.scrollHeight;[span_21](start_span)[span_21](end_span)
  return bubble;[span_22](start_span)[span_22](end_span)
}

async function sendToBackend(message) {[span_23](start_span)[span_23](end_span)
  const response = await fetch(`${BACKEND_URL}/api/chat`, {[span_24](start_span)[span_24](end_span)
    method: "POST",[span_25](start_span)[span_25](end_span)
    headers: { "Content-Type": "application/json" },[span_26](start_span)[span_26](end_span)
    body: JSON.stringify({ message, history }),[span_27](start_span)[span_27](end_span)
  });

  if (!response.ok) {[span_28](start_span)[span_28](end_span)
    const errBody = await response.json().catch(() => ({}));[span_29](start_span)[span_29](end_span)
    throw new Error(errBody.error || `সার্ভার এরর: ${response.status}`);[span_30](start_span)[span_30](end_span)
  }

  const data = await response.json();[span_31](start_span)[span_31](end_span)
  return data.reply;[span_32](start_span)[span_32](end_span)
}

composerForm.addEventListener("submit", async (e) => {[span_33](start_span)[span_33](end_span)
  e.preventDefault();[span_34](start_span)[span_34](end_span)
  const text = messageInput.value.trim();[span_35](start_span)[span_35](end_span)
  if (!text) return;[span_36](start_span)[span_36](end_span)

  addBubble("customer", text);[span_37](start_span)[span_37](end_span)
  history.push({ role: "customer", text });[span_38](start_span)[span_38](end_span)
  messageInput.value = "";[span_39](start_span)[span_39](end_span)
  messageInput.disabled = true;[span_40](start_span)[span_40](end_span)
  sendBtn.disabled = true;[span_41](start_span)[span_41](end_span)

  const typingBubble = showTyping();[span_42](start_span)[span_42](end_span)

  try {
    const reply = await sendToBackend(text);[span_43](start_span)[span_43](end_span)
    typingBubble.remove();[span_44](start_span)[span_44](end_span)
    addBubble("agent", reply);[span_45](start_span)[span_45](end_span)
    history.push({ role: "agent", text: reply });[span_46](start_span)[span_46](end_span)
  } catch (err) {
    typingBubble.remove();[span_47](start_span)[span_47](end_span)
    addBubble("agent", `দুঃখিত, একটা সমস্যা হয়েছে: ${err.message}`);[span_48](start_span)[span_48](end_span)
  } finally {
    messageInput.disabled = false;[span_49](start_span)[span_49](end_span)
    sendBtn.disabled = false;[span_50](start_span)[span_50](end_span)
    messageInput.focus();[span_51](start_span)[span_51](end_span)
  }
});

// Simple call-duration timer, purely cosmetic
let seconds = 0;[span_52](start_span)[span_52](end_span)
setInterval(() => {
  seconds += 1;[span_53](start_span)[span_53](end_span)
  const m = String(Math.floor(seconds / 60)).padStart(2, "0");[span_54](start_span)[span_54](end_span)
  const s = String(seconds % 60).padStart(2, "0");[span_55](start_span)[span_55](end_span)
  callTimer.textContent = `${m}:${s}`;[span_56](start_span)[span_56](end_span)
}, 1000);

// Kick off the call with the agent's opening line
window.addEventListener("DOMContentLoaded", () => {[span_57](start_span)[span_57](end_span)
  addBubble("agent", GREETING);[span_58](start_span)[span_58](end_span)
  history.push({ role: "agent", text: GREETING });[span_59](start_span)[span_59](end_span)
});
