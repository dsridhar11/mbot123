from flask import Flask, render_template, request, jsonify, session, send_from_directory
import google.generativeai as genai
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY") # Make sure you have SECRET_KEY set in your .env file

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") # Make sure you have GOOGLE_API_KEY set in your .env file
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
    You are a medical assistant. Help the user identify diseases from symptoms.
    Structure replies clearly and professionally.
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
    return render_template("index.html")

@app.route("/signup")
def signup():
    return render_template("create_account.html")

@app.route("/chatbot")
def chatbot():
    if 'history' not in session:
        session['history'] = []
    return render_template("chatbot.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        user_input = request.json.get("message")
        if not user_input:
            return jsonify({"error": "No input provided"}), 400

        # Maintain session history
        if 'history' not in session:
            session['history'] = []

        raw_history = session['history']
        clean_history = []

        for msg in raw_history:
            if 'parts' in msg:
                clean_history.append(msg)
            elif 'text' in msg:
                clean_history.append({
                    "role": msg["role"],
                    "parts": [{"text": msg["text"]}]
                })

        convo = model.start_chat(history=clean_history)
        convo.send_message(user_input)
        bot_reply = convo.last.text

        clean_history.append({"role": "user", "parts": [{"text": user_input}]})
        clean_history.append({"role": "model", "parts": [{"text": bot_reply}]})
        session['history'] = clean_history

        # === Generate summary report with proper sections and bolded headings ===
        summary_prompt = f"""
        Based on the following conversation, extract and present the information under these **three bolded headings**:

        **1. Symptoms Mentioned**
        **2. Possible Conditions or Risks**
        **3. Recommended Actions**

        Ensure each section is clearly separated by a blank line. Do not include any introductory or concluding remarks outside these sections. Format each heading in bold using double asterisks.

        Conversation:
        User: {user_input}
        Assistant: {bot_reply}
        """

        summary_convo = model.start_chat()
        summary_convo.send_message(summary_prompt)
        raw_summary = summary_convo.last.text.strip()

        # Save the raw_summary (which now contains markdown formatting from Gemini)
        summary = raw_summary
        save_summary_report(summary)

        return jsonify({"reply": bot_reply})

    except Exception as e:
        print("💥 Flask error:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/reports")
def list_reports():
    files = os.listdir("reports")
    files.sort(reverse=True) # Show newest reports first
    return jsonify({"reports": files})

@app.route("/report/<filename>")
def view_report(filename):
    # This route is kept for direct file access if needed (e.g., download)
    return send_from_directory("reports", filename)

@app.route("/report_content/<filename>") # NEW ROUTE to get report content as plain text for JS
def get_report_content(filename):
    try:
        report_path = os.path.join("reports", filename)
        with open(report_path, "r", encoding="utf-8") as f:
            content = f.read()
        return jsonify({"content": content})
    except FileNotFoundError:
        return jsonify({"error": "Report not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# === MAIN ===
if __name__ == '__main__':
    # Ensure 'reports' directory exists on startup
    os.makedirs("reports", exist_ok=True)
    app.run(debug=True)
