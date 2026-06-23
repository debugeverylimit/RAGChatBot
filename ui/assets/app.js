const EXAMPLE_QUESTIONS = [
  "What is the expense ratio of HDFC Mid Cap Fund Direct Growth?",
  "What is the exit load on HDFC Defence Fund Direct Growth?",
  "Who manages HDFC Gold ETF Fund of Fund Direct Plan Growth?",
];

const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("chat-form");
const inputEl = document.getElementById("chat-input");
const sendBtnEl = document.getElementById("send-btn");
const examplesEl = document.getElementById("examples");

let loadingEl = null;

function createMessageElement(role, text, metaHtml = "") {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;
  wrapper.innerHTML = `${escapeHtml(text)}${metaHtml}`;
  return wrapper;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function splitAnswerAndFooter(answer) {
  const marker = "\n\nLast updated from sources:";
  const index = answer.lastIndexOf(marker);
  if (index === -1) {
    return { body: answer, footer: null };
  }
  return {
    body: answer.slice(0, index).trim(),
    footer: answer.slice(index + marker.length).trim(),
  };
}

function renderExamples() {
  examplesEl.innerHTML = "";
  for (const question of EXAMPLE_QUESTIONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "example-btn";
    button.textContent = question;
    button.addEventListener("click", () => {
      inputEl.value = question;
      formEl.requestSubmit();
    });
    examplesEl.appendChild(button);
  }
}

function showLoading() {
  hideLoading();
  loadingEl = document.createElement("div");
  loadingEl.className = "loading";
  loadingEl.innerHTML = '<span class="spinner"></span><span>Fetching source-backed answer…</span>';
  messagesEl.appendChild(loadingEl);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideLoading() {
  if (loadingEl) {
    loadingEl.remove();
    loadingEl = null;
  }
}

function buildAssistantMeta(data) {
  const citationLabel = data.is_refusal ? "Educational source" : "Source";
  const safeUrl = escapeAttr(data.citation_url);
  return `
    <div class="message-meta">
      <div><strong>${citationLabel}:</strong> <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.citation_url)}</a></div>
      <div><strong>Last updated:</strong> ${escapeHtml(data.last_updated)}</div>
      <div><strong>Disclaimer:</strong> ${escapeHtml(data.disclaimer)}</div>
    </div>
  `;
}

async function sendMessage(message) {
  const trimmed = message.trim();
  if (!trimmed) return;

  messagesEl.appendChild(createMessageElement("user", trimmed));
  inputEl.value = "";
  sendBtnEl.disabled = true;
  showLoading();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
    });

    const data = await response.json();
    hideLoading();

    if (!response.ok) {
      messagesEl.appendChild(
        createMessageElement("error", data.error || "Something went wrong. Please try again."),
      );
      return;
    }

    messagesEl.appendChild(
      createMessageElement(
        "assistant",
        splitAnswerAndFooter(data.answer).body,
        buildAssistantMeta(data),
      ),
    );
  } catch {
    hideLoading();
    messagesEl.appendChild(
      createMessageElement("error", "Network error. Check that the API server is running."),
    );
  } finally {
    sendBtnEl.disabled = false;
    messagesEl.scrollTop = messagesEl.scrollHeight;
    inputEl.focus();
  }
}

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(inputEl.value);
});

renderExamples();
inputEl.focus();
