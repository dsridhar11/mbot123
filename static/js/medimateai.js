// Function to parse basic markdown (for bolding and lists)
function parseMarkdown(text) {
    let parsedText = text;

    // 1. Convert **bold** to <strong>bold</strong>
    parsedText = parsedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 2. Convert * list items to <ul> and <li>
    // This is a basic approach and might not handle all edge cases of markdown lists.
    // For more robust list parsing, a dedicated markdown library is recommended.
    const lines = parsedText.split('<br>'); // Split by <br> from previous step
    let inList = false;
    let newLines = [];

    lines.forEach(line => {
        if (line.trim().startsWith('* ')) {
            if (!inList) {
                newLines.push('<ul>');
                inList = true;
            }
            newLines.push(`<li>${line.trim().substring(2).trim()}</li>`);
        } else {
            if (inList) {
                newLines.push('</ul>');
                inList = false;
            }
            newLines.push(line);
        }
    });
    if (inList) { // Close list if still open at the end
        newLines.push('</ul>');
    }
    parsedText = newLines.join('');


    // 3. Convert newlines to <br> for HTML display (do this last, after list processing)
    // This was already done, but ensure it's applied correctly after other parsing.
    // Re-doing it here after list processing to catch any newlines introduced
    // by list item content. Better to do it once at the end if the list parser
    // doesn't introduce its own <br>.
    // Given the split('<br>') earlier, let's refine the order.
    // Let's ensure the initial splitting for lists is on actual newlines,
    // and the <br> conversion is the final step.

    // REVISED parseMarkdown to handle order better:
    // This is a more robust (but still simple) markdown parser for the chat.
    // For production, consider a small, lightweight markdown-to-HTML library.
    parsedText = text; // Start with original text

    // Convert **bold** to <strong>bold</strong>
    parsedText = parsedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Handle * list items (very basic, assumes one list, no nested lists)
    // This pattern matches lines starting with * followed by a space.
    // It captures content after * and then wraps it in <li>.
    // Then it wraps the whole block of <li>s in <ul>.
    const listRegex = /(\* [^\n]+(?:\n\* [^\n]+)*)/g;
    parsedText = parsedText.replace(listRegex, (match) => {
        const listItems = match.split('\n').map(item => {
            if (item.trim().startsWith('* ')) {
                return `<li>${item.trim().substring(2).trim()}</li>`;
            }
            return ''; // Should not happen with this regex
        }).join('');
        return `<ul>${listItems}</ul>`;
    });

    // Convert newlines to <br> for HTML display
    parsedText = parsedText.replace(/\n/g, '<br>');


    return parsedText;
}


// Send message and get AI reply
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
            // APPLY MARKDOWN PARSING TO BOT REPLY HERE
            addMessageToChat("bot", data.reply, true); // Pass true to indicate markdown parsing
            await loadReports(); // Update reports after AI reply
        } else {
            addMessageToChat("bot", "⚠️ Error: " + data.error);
        }
    } catch (err) {
        addMessageToChat("bot", "⚠️ Server error occurred.");
    }
});

// Add message to chat window
// Added an optional 'parseAsMarkdown' parameter
function addMessageToChat(sender, text, parseAsMarkdown = false) {
    const chatBody = document.querySelector(".chat-body");

    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${sender}`;

    let content = text;
    if (parseAsMarkdown) {
        content = parseMarkdown(text);
    } else {
        // If not parsing markdown, still convert newlines for basic readability
        content = text.replace(/\n/g, '<br>');
    }

    messageDiv.innerHTML = `<p>${content}</p>`; // Use the processed content
    messageDiv.style.marginBottom = "1rem";

    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

// Load and refresh saved reports (no changes needed here)
async function loadReports() {
    const container = document.querySelector(".chat-history");

    // Remove old report list if exists
    const oldList = container.querySelector(".report-list");
    if (oldList) oldList.remove();

    try {
        const res = await fetch("/reports");
        const data = await res.json();

        const list = document.createElement("div");
        list.className = "report-list";
        list.innerHTML = "<h3>Saved Reports</h3>";

        if (data.reports.length === 0) {
            list.innerHTML += "<p>No reports yet.</p>";
        } else {
            data.reports.forEach(file => {
                const item = document.createElement("div");
                item.className = "chat-item";
                const reportName = document.createElement("span");
                reportName.textContent = file;
                reportName.style.cursor = "pointer";
                reportName.onclick = () => showReportModal(file);

                item.appendChild(reportName);
                list.appendChild(item);
            });
        }

        container.appendChild(list);
    } catch (e) {
        console.error("Failed to load reports", e);
    }
}

// Function to show a modal with the report content (no changes needed here)
async function showReportModal(filename) {
    try {
        const res = await fetch(`/report_content/${filename}`);
        const data = await res.json();

        if (data.content) {
            const reportContentHtml = parseMarkdown(data.content); // This already uses parseMarkdown

            const modal = document.createElement('div');
            modal.className = 'report-modal-overlay';
            modal.innerHTML = `
                <div class="report-modal-content">
                    <h3>Report: ${filename}</h3>
                    <div class="report-text">${reportContentHtml}</div>
                    <button class="close-modal-btn">Close</button>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('.close-modal-btn').onclick = () => {
                document.body.removeChild(modal);
            };
            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            };

        } else {
            alert("Error loading report: " + (data.error || "Unknown error"));
        }
    } catch (e) {
        console.error("Error showing report modal:", e);
        alert("Failed to load report content. Please check console for details.");
    }
}

// Load reports on page load
window.addEventListener("DOMContentLoaded", loadReports);
