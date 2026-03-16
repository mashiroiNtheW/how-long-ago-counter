window.APP_CONFIG = window.APP_CONFIG || {
  apiBaseUrl: "https://how-long-ago-counter-api-production.up.railway.app/",
};

const config = {
  apiBaseUrl: window.APP_CONFIG?.apiBaseUrl?.replace(/\/$/, "") || "",
  fallbackDataUrl: "./data/dates.json",
};

const counterList = document.querySelector("#counter-list");
const form = document.querySelector("#date-form");
const refreshButton = document.querySelector("#refresh-button");
const statusMessage = document.querySelector("#status-message");
const labelInput = document.querySelector("#label-input");
const dateInput = document.querySelector("#date-input");

function setStatus(message) {
  statusMessage.textContent = message;
}

function formatElapsed(dateString) {
  const then = new Date(dateString);
  const now = new Date();
  const diffMs = Math.max(now.getTime() - then.getTime(), 0);

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const yearMs = 365.25 * dayMs;

  const years = Math.floor(diffMs / yearMs);
  const days = Math.floor((diffMs % yearMs) / dayMs);
  const hours = Math.floor((diffMs % dayMs) / hourMs);
  const minutes = Math.floor((diffMs % hourMs) / minuteMs);

  const parts = [];
  if (years) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (days) parts.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours && parts.length < 2) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (!parts.length) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);

  return parts.slice(0, 2).join(", ");
}

function renderCounters(dates) {
  if (!dates.length) {
    counterList.innerHTML = "<p class='muted'>No dates yet.</p>";
    return;
  }

  counterList.innerHTML = dates
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((item) => {
      const safeLabel = escapeHtml(item.label);
      const prettyDate = new Date(item.date).toLocaleString();

      return `
        <article class="counter-card">
          <h3>${safeLabel}</h3>
          <p class="counter-value">${formatElapsed(item.date)} ago</p>
          <p class="counter-date">${prettyDate}</p>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fetchDates() {
  const remoteUrl = config.apiBaseUrl ? `${config.apiBaseUrl}/api/data/dates.json` : null;

  if (remoteUrl) {
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    return response.json();
  }

  const response = await fetch(config.fallbackDataUrl);
  if (!response.ok) {
    throw new Error(`Fallback request failed with status ${response.status}`);
  }
  return response.json();
}

async function loadCounters() {
  setStatus("Loading counters...");

  try {
    const dates = await fetchDates();
    renderCounters(dates);
    setStatus(config.apiBaseUrl ? "Loaded from API." : "Loaded fallback data. Set an API URL to enable saving.");
  } catch (error) {
    counterList.innerHTML = "<p class='muted'>Unable to load counters.</p>";
    setStatus(error.message);
  }
}

async function addDate(event) {
  event.preventDefault();

  if (!config.apiBaseUrl) {
    setStatus("Saving is disabled until you set window.APP_CONFIG.apiBaseUrl in docs/app.js.");
    return;
  }

  const payload = {
    label: labelInput.value.trim(),
    date: new Date(dateInput.value).toISOString(),
  };

  form.querySelector("button").disabled = true;
  setStatus("Saving date...");

  try {
    const response = await fetch(`${config.apiBaseUrl}/api/dates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `Save failed with status ${response.status}`);
    }

    form.reset();
    setStatus(`Saved "${data.label}".`);
    await loadCounters();
  } catch (error) {
    setStatus(error.message);
  } finally {
    form.querySelector("button").disabled = false;
  }
}

form.addEventListener("submit", addDate);
refreshButton.addEventListener("click", loadCounters);

loadCounters();
setInterval(loadCounters, 60 * 1000);
