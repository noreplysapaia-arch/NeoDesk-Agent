"""
Neodesk AI Call Center Agent - "Rimi"
Backend: Flask API powered by Google Gemini.

Local run:
    pip install -r requirements.txt
    export GEMINI_API_KEY=your_key_here   (Windows: set GEMINI_API_KEY=...)
    python app.py

Deploy: see ../README.md
"""

import os

import google.generativeai as genai
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY পাওয়া যায়নি। .env ফাইলে বা environment variable হিসেবে সেট করুন।"
    )

genai.configure(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-2.0-flash"

AGENT_NAME = "রিমি"
COMPANY_NAME = "Neodesk"

CUSTOMER_DATA = {
    "name": "তানভীর আহমেদ",
    "product": "Ergonomic Office Chair",
    "delivery_window": "আগামীকাল সকাল ১০টা থেকে ১টার মধ্যে",
    "address": "বনানী, ঢাকা",
}

SYSTEM_PROMPT = f"""
তুমি {COMPANY_NAME} কোম্পানির এআই কল সেন্টার এজেন্ট "{AGENT_NAME}"।
তোমার কাজ হলো কাস্টমারকে ফোন করে অর্ডার কনফার্ম করা।

অর্ডারের তথ্য:
- গ্রাহকের নাম: {CUSTOMER_DATA['name']}
- প্রোডাক্ট: {CUSTOMER_DATA['product']}
- ডেলিভারি সময়: {CUSTOMER_DATA['delivery_window']}
- ঠিকানা: {CUSTOMER_DATA['address']}

নিয়ম:
- প্রাকৃতিক, ভদ্র বাংলা/বাংলিশে কথা বলবে, রোবটের মতো নয়।
- বাক্য ছোট রাখবে, ১-২ বাক্যের মধ্যে উত্তর দেবে (ভয়েস কল সিমুলেশন)।
- কখনো তথ্য বানিয়ে বলবে না। পেমেন্ট বা অন্য কিছু নিশ্চিত না জানলে বলবে চেক করে জানাবে।
- কাস্টমার রেগে গেলে শান্তভাবে বুঝে সাড়া দেবে, তর্ক করবে না।
- অর্ডার কনফার্মেশন, ডেলিভারি ঠিকানা/সময় ভেরিফাই করা এবং সাধারণ প্রশ্নের উত্তর দেওয়াই মূল কাজ।
"""

app = Flask(__name__)
CORS(app)  # allow requests from the Netlify frontend


def build_gemini_history(client_history):
    """
    Convert our simple [{role, text}] history into Gemini's expected
    [{role: "user"/"model", parts: [text]}] format.
    """
    gemini_history = []
    for turn in client_history:
        role = "model" if turn.get("role") == "agent" else "user"
        gemini_history.append({"role": role, "parts": [turn.get("text", "")]})
    return gemini_history


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    history = data.get("history") or []  # [{role: "customer"/"agent", text: "..."}]

    if not user_message:
        return jsonify({"error": "message খালি থাকতে পারবে না।"}), 400

    try:
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            system_instruction=SYSTEM_PROMPT,
        )
        chat_session = model.start_chat(history=build_gemini_history(history))
        response = chat_session.send_message(user_message)
        reply_text = response.text.strip()
    except Exception as exc:  # noqa: BLE001 - surface a clean error to the frontend
        return jsonify({"error": f"Gemini API কল ব্যর্থ হয়েছে: {exc}"}), 500

    return jsonify({"reply": reply_text})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
