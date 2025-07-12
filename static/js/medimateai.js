document.querySelector(".send-btn").addEventListener("click", async () => {
  const input = document.querySelector(".input-wrapper input");
  const message = input.value.trim();

  if (!message) return;

  addMessageToChat("user", message);
  input.value = "";

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await res.json();
    if (data.reply) {
      addMessageToChat("bot", data.reply);
    } else {
      addMessageToChat("bot", "⚠️ Error: " + data.error);
    }
  } catch (err) {
    addMessageToChat("bot", "⚠️ Server error occurred.");
  }
});

function addMessageToChat(sender, text) {
  const chatBody = document.querySelector(".chat-body");

  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${sender}`;
  messageDiv.innerHTML = `<p>${text}</p>`;
  messageDiv.style.marginBottom = "1rem";

  chatBody.appendChild(messageDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// Load reports into sidebar
async function loadReports() {
  const container = document.querySelector(".chat-history");
  if (!container) return;

  try {
    const res = await fetch("/reports");
    const data = await res.json();

    const list = document.createElement("div");
    list.innerHTML = "<h3>Saved Reports</h3>";
    
    if (data.reports.length === 0) {
      list.innerHTML += "<p>No reports yet.</p>";
    } else {
      data.reports.forEach(file => {
        const item = document.createElement("div");
        item.className = "chat-item";
        item.innerHTML = `<a href="/report/${file}" target="_blank">${file}</a>`;
        list.appendChild(item);
      });
    }

    container.appendChild(list);
  } catch (e) {
    console.error("Failed to load reports", e);
  }
}

// Call it on page load
window.addEventListener("DOMContentLoaded", loadReports);
