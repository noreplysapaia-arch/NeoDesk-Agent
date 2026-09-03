// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const BACKEND_URL = "http://localhost:5000";
const FALLBACK_GREETING =
  "আসসালামু আলাইকুম! আমি Neodesk থেকে রিমি বলছি। আমি কি তানভীর আহমেদ সাহেবের সাথে কথা বলছি?";

const RECOGNITION_LANG = { bn: "bn-BD", en: "en-US" };

// ---------------------------------------------------------------------------
// ELEMENTS
// ---------------------------------------------------------------------------
const launcherBtn = document.getElementById("launcherBtn");
const callWidget = document.getElementById("callWidget");
const closeWidget = document.getElementById("closeWidget");
const speakerToggle = document.getElementById("speakerToggle");
const speakerIcon = document.getElementById("speakerIcon");
const avatarRing = document.getElementById("avatarRing");
const statusText = document.getElementById("statusText");
const nameInput = document.getElementById("nameInput");
const langSelect = document.getElementById("langSelect");
const transcript = document.getElementById("transcript");
const micBtn = document.getElementById("micBtn");
const callBtn = document.getElementById("callBtn");
const callBtnLabel = document.getElementById("callBtnLabel");
const ttsAudio = document.getElementById("ttsAudio");

// ---------------------------------------------------------------------------
// STATE
// ---------------------------------------------------------------------------
let inCall = false;
let isMuted = false;
let isListening = false;
let history = []; // [{role: "agent"|"customer", text}]
let recognition = null;

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

// ---------------------------------------------------------------------------
// UI HELPERS
// ---------------------------------------------------------------------------
function setStatus(text) {
  statusText.textContent = text;
}

function addTranscriptLine(role, text) {
  const line = document.createElement("div");
  line.className = `line ${role}`;
  line.textContent = text;
  transcript.appendChild(line);
  transcript.scrollTop = transcript.scrollHeight;
}

function setAvatarState(state) {
  avatarRing.classList.remove("listening", "speaking");
  if (state) avatarRing.classList.add(state);
}

function openWidget() {
  callWidget.hidden = false;
  launcherBtn.hidden = true;
}

function closeWidgetFn() {
  endCall();
  callWidget.hidden = true;
  launcherBtn.hidden = false;
}

// ---------------------------------------------------------------------------
// TTS PLAYBACK
// ---------------------------------------------------------------------------
async function speak(text) {
  setAvatarState("speaking");
  setStatus("রিমি বলছে...");

  try {
    const res = await fetch(`${BACKEND_URL}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang: langSelect.value }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || "TTS ব্যর্থ হয়েছে");

    if (!isMuted) {
      ttsAudio.src = `data:${data.mime};base64,${data.audio_base64}`;
      await ttsAudio.play();
      await new Promise((resolve) => {
        ttsAudio.onended = resolve;
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    setAvatarState(null);
    setStatus(inCall ? "মাইক চাপুন এবং কথা বলুন" : "কল শুরু করতে প্রস্তুত");
  }
}

// ---------------------------------------------------------------------------
// CHAT (Gemini backend)
// ---------------------------------------------------------------------------
async function sendToAgent(customerText) {
  addTranscriptLine("customer", customerText);
  history.push({ role: "customer", text: customerText });
  setStatus("চিন্তা করছি...");

  try {
    const res = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: customerText, history }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "সার্ভার এরর");

    addTranscriptLine("agent", data.reply);
    history.push({ role: "agent", text: data.reply });
    await speak(data.reply);
  } catch (err) {
    const msg = `দুঃখিত, একটা সমস্যা হয়েছে: ${err.message}`;
    addTranscriptLine("agent", msg);
    setStatus("আবার চেষ্টা করুন");
  }
}

// ---------------------------------------------------------------------------
// SPEECH RECOGNITION (mic input)
// ---------------------------------------------------------------------------
function setupRecognition() {
  if (!SpeechRecognitionAPI) return null;

  const rec = new SpeechRecognitionAPI();
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    isListening = true;
    micBtn.classList.add("active");
    setAvatarState("listening");
    setStatus("শুনছি...");
  };

  rec.onresult = (event) => {
    const text = event.results[0][0].transcript.trim();
    if (text) sendToAgent(text);
  };

  rec.onerror = (event) => {
    if (event.error === "not-allowed" || event.error === "permission-denied") {
      setStatus("মাইক্রোফোন পারমিশন দরকার।");
    } else if (event.error !== "no-speech") {
      setStatus("শুনতে সমস্যা হয়েছে, আবার চেষ্টা করুন।");
    }
  };

  rec.onend = () => {
    isListening = false;
    micBtn.classList.remove("active");
    if (avatarRing.classList.contains("listening")) setAvatarState(null);
  };

  return rec;
}

function toggleMic() {
  if (!inCall) return;
  if (!recognition) {
    setStatus("এই ব্রাউজারে ভয়েস ইনপুট সাপোর্ট করে না। Chrome ব্যবহার করুন।");
    return;
  }
  if (isListening) {
    recognition.stop();
  } else {
    recognition.lang = RECOGNITION_LANG[langSelect.value] || "bn-BD";
    try {
      recognition.start();
    } catch (err) {
      // start() throws if already started; safe to ignore
    }
  }
}

// ---------------------------------------------------------------------------
// CALL LIFECYCLE
// ---------------------------------------------------------------------------
async function startCall() {
  inCall = true;
  history = [];
  transcript.innerHTML = "";
  callBtn.classList.add("in-call");
  callBtnLabel.textContent = "End Call";
  micBtn.disabled = false;
  setStatus("সংযোগ হচ্ছে...");

  let greetingText = FALLBACK_GREETING;
  try {
    const res = await fetch(`${BACKEND_URL}/api/greeting`);
    if (res.ok) {
      const data = await res.json();
      greetingText = data.text || greetingText;
    }
  } catch (err) {
    // fall back to local greeting if backend is unreachable
  }

  addTranscriptLine("agent", greetingText);
  history.push({ role: "agent", text: greetingText });
  await speak(greetingText);
}

function endCall() {
  if (recognition && isListening) recognition.stop();
  ttsAudio.pause();
  inCall = false;
  callBtn.classList.remove("in-call");
  callBtnLabel.textContent = "Start Call";
  micBtn.disabled = true;
  micBtn.classList.remove("active");
  setAvatarState(null);
  setStatus("কল শুরু করতে প্রস্তুত");
}

// ---------------------------------------------------------------------------
// EVENT WIRING
// ---------------------------------------------------------------------------
launcherBtn.addEventListener("click", openWidget);
closeWidget.addEventListener("click", closeWidgetFn);

speakerToggle.addEventListener("click", () => {
  isMuted = !isMuted;
  speakerToggle.classList.toggle("muted", isMuted);
  if (isMuted) ttsAudio.pause();
});

micBtn.addEventListener("click", toggleMic);

callBtn.addEventListener("click", () => {
  if (inCall) {
    endCall();
  } else {
    startCall();
  }
});

// init
micBtn.disabled = true;
recognition = setupRecognition();
if (!SpeechRecognitionAPI) {
  setStatus("এই ব্রাউজারে ভয়েস ইনপুট সাপোর্ট করে না। Chrome ব্যবহার করুন।");
}
