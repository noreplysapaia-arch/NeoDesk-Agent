# Neodesk AI Call Center — "রিমি"

Gemini API চালিত অর্ডার-কনফার্মেশন চ্যাট এজেন্ট। Frontend Netlify-তে, Backend যেকোনো ফ্রি পাইথন হোস্টিং (Render সবচেয়ে সহজ)-এ চলবে।

## ফাইল স্ট্রাকচার

```
neodesk-project/
├── backend/
│   ├── app.py              # Flask API (Gemini কল করে)
│   ├── requirements.txt
│   ├── .env.example        # GEMINI_API_KEY-এর নমুনা
│   └── Procfile             # Render/Railway-এর জন্য
├── frontend/
│   ├── index.html          # চ্যাট ইন্টারফেস
│   ├── style.css
│   └── script.js           # BACKEND_URL এখানে বসাতে হবে
├── netlify.toml
└── README.md
```

---

## ধাপ ১: লোকালি টেস্ট করা

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# .env ফাইল খুলে GEMINI_API_KEY=... বসিয়ে দিন
python app.py
```

ব্যাকএন্ড চলবে `http://localhost:5000`-এ।

এরপর `frontend/index.html` ব্রাউজারে সরাসরি খুলুন (ডাবল-ক্লিক করলেই হবে) — `script.js`-এ `BACKEND_URL` ইতিমধ্যে `http://localhost:5000` সেট করা আছে, তাই লোকালি সব কাজ করবে।

---

## ধাপ ২: ব্যাকএন্ড ডেপ্লয় করা (Render — ফ্রি টিয়ার)

Netlify শুধু স্ট্যাটিক ফাইল হোস্ট করে, পাইথন চালাতে পারে না — তাই ব্যাকএন্ডের জন্য আলাদা ফ্রি সার্ভিস লাগবে। Render সবচেয়ে সহজ:

1. প্রজেক্টটা GitHub-এ পুশ করুন (পুরো `neodesk-project` ফোল্ডার একটা রিপোতে)।
2. [render.com](https://render.com)-এ অ্যাকাউন্ট খুলুন, **New → Web Service** এ ক্লিক করুন।
3. আপনার GitHub রিপো কানেক্ট করুন।
4. এই সেটিংস দিন:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
5. **Environment Variables**-এ যোগ করুন: `GEMINI_API_KEY` = আপনার আসল কী।
6. Deploy চাপুন। কিছুক্ষণ পর একটা URL পাবেন, যেমন:
   `https://neodesk-backend.onrender.com`

> ফ্রি টিয়ারে প্রথম রিকোয়েস্টে সার্ভার "ঘুম থেকে উঠতে" কিছুটা সময় (৩০-৫০ সেকেন্ড) নিতে পারে — এটা স্বাভাবিক।

---

## ধাপ ৩: ফ্রন্টএন্ডে ব্যাকএন্ড URL বসানো

`frontend/script.js` ফাইলে প্রথম লাইনের কাছে খুঁজুন:

```js
const BACKEND_URL = "http://localhost:5000";
```

এটাকে বদলে দিন Render থেকে পাওয়া URL দিয়ে:

```js
const BACKEND_URL = "https://neodesk-backend.onrender.com";
```

---

## ধাপ ৪: ফ্রন্টএন্ড Netlify-তে ডেপ্লয় করা

1. একই GitHub রিপো [netlify.com](https://netlify.com)-এ কানেক্ট করুন (**Add new site → Import from Git**)।
2. Build settings:
   - **Base directory:** খালি রাখুন (root)
   - **Publish directory:** `frontend`
   - **Build command:** খালি রাখুন
3. `netlify.toml` ফাইলটা রুটে আছে বলে Netlify নিজে থেকেই `publish = "frontend"` সেটিং পড়ে নেবে।
4. Deploy করুন। কিছুক্ষণের মধ্যে একটা লাইভ URL পাবেন (যেমন `https://neodesk-rimi.netlify.app`)।

---

## ধাপ ৫: টেস্ট করা

লাইভ Netlify URL-এ ঢুকে চ্যাট শুরু করুন। রিমি প্রথমে গ্রিটিং পাঠাবে, আপনি রিপ্লাই দিলে Gemini API থেকে রিয়েল-টাইমে জবাব আসবে।

---

## কাস্টমাইজেশন

- **অর্ডার ডেটা / সিস্টেম প্রম্পট বদলাতে:** `backend/app.py`-তে `CUSTOMER_DATA` আর `SYSTEM_PROMPT` এডিট করুন।
- **এজেন্টের ভয়েস (TTS) যোগ করতে:** আগের `neodesk_agent.py` স্ক্রিপ্টের `edge-tts` অংশটা এই ব্যাকএন্ডের `/api/chat` রেসপন্সের সাথে জুড়ে audio URL রিটার্ন করা যায় — চাইলে সেটাও পরের ধাপে বানিয়ে দেওয়া যাবে।
- **একাধিক কাস্টমার/অর্ডার হ্যান্ডেল করতে:** এখন ডেটা হার্ডকোড করা আছে; প্রোডাকশনে এটা ডাটাবেজ বা CRM থেকে ডায়নামিকভাবে লোড করতে হবে।

## নিরাপত্তা নোট

- `GEMINI_API_KEY` কখনো ফ্রন্টএন্ড কোডে (JS ফাইলে) রাখবেন না — এটা ব্যাকএন্ডেই থাকবে, কারণ ব্রাউজার থেকে যেকেউ দেখতে পারবে।
- `.env` ফাইল `.gitignore`-এ রাখুন যাতে GitHub-এ পুশ না হয়।
