from flask import Flask, render_template, request, jsonify, session, send_from_directory
import google.generativeai as genai
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")  # Needed for session cookie

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    generation_config={
        "temperature": 0.7,
        "top_p": 1,
        "top_k": 1,
        "max_output_tokens": 2048
    },
    system_instruction="""
    You are a medical assistant. Help the user identify disease by symptoms.
    Don't answer questions outside the medical field. Also help identify risks
    and other info about the disease.
    """
)

def save_summary_report(summary_text):
    os.makedirs("reports", exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"reports/summary_{timestamp}.txt"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(f"🗓 Report Generated: {timestamp}\n\n")
        f.write(summary_text)

# === ROUTES ===

@app.route("/")
def homepage():
    return render_template("index.html")  # Front page

@app.route("/chatbot")
def chatbot():
    if 'history' not in session:
        session['history'] = []
    return render_template("chatbot.html")  # Chatbot UI

@app.route("/chat", methods=["POST"])
def chat():
    try:
        user_input = request.json.get("message")
        if not user_input:
            return jsonify({"error": "No input provided"}), 400

        # Load history
        if 'history' not in session:
            session['history'] = []
        raw_history = session['history']
        clean_history = []

        # Normalize history format for Gemini
        for msg in raw_history:
            if 'parts' in msg:
                clean_history.append(msg)
            elif 'text' in msg:
                clean_history.append({
                    "role": msg["role"],
                    "parts": [{"text": msg["text"]}]
                })

        # Chat and respond
        convo = model.start_chat(history=clean_history)
        convo.send_message(user_input)
        bot_reply = convo.last.text

        # Append new messages
        clean_history.append({"role": "user", "parts": [{"text": user_input}]})
        clean_history.append({"role": "model", "parts": [{"text": bot_reply}]})
        session['history'] = clean_history

        # Generate and store summary report
        summary_prompt = f"""
        Summarize the following patient input and medical assistant's reply. Format like a doctor's note.

        User: {user_input}

        Assistant: {bot_reply}

        Include:
        - Symptoms mentioned
        - Conditions or risks
        """

        summary_convo = model.start_chat()
        summary_convo.send_message(summary_prompt)
        summary = summary_convo.last.text.strip()

        save_summary_report(summary)

        return jsonify({"reply": bot_reply})

    except Exception as e:
        print("💥 Flask error:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/reports")
def list_reports():
    files = os.listdir("reports")
    files.sort(reverse=True)
    return jsonify({"reports": files})

@app.route("/report/<filename>")
def view_report(filename):
    return send_from_directory("reports", filename)

# === MAIN ===
if __name__ == '__main__':
    app.run(debug=True)
