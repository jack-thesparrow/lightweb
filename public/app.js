const form = document.querySelector("#greeting-form");
const nameInput = document.querySelector("#name");
const submitButton = document.querySelector("#submit");
const response = document.querySelector("#response");
const responseText = document.querySelector("#response-text");
const responseMeta = document.querySelector("#response-meta");
const status = document.querySelector("#status");
const statusText = document.querySelector("#status-text");
const greetingCount = document.querySelector("#greeting-count");
const requestCount = document.querySelector("#request-count");
const uptime = document.querySelector("#uptime");
const recentList = document.querySelector("#recent-list");
const refreshButton = document.querySelector("#refresh-greetings");

function formatUptime(totalSeconds) {
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${totalSeconds % 60}s`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function setOnline(online) {
  status.classList.toggle("online", online);
  status.classList.toggle("offline", !online);
  statusText.textContent = online ? "Backend online" : "Backend offline";
}

async function loadStats() {
  try {
    const res = await fetch("/api/stats", { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const data = await res.json();
    greetingCount.textContent = data.greetingCount;
    requestCount.textContent = data.requestCount;
    uptime.textContent = formatUptime(data.uptimeSeconds);
    setOnline(true);
  } catch {
    setOnline(false);
    greetingCount.textContent = "—";
    requestCount.textContent = "—";
    uptime.textContent = "—";
  }
}

function renderRecentGreetings(greetings) {
  recentList.replaceChildren();

  if (!greetings.length) {
    const empty = document.createElement("li");
    empty.className = "recent-empty";
    empty.textContent = "No greetings yet. Say hello above to start.";
    recentList.append(empty);
    return;
  }

  for (const greeting of greetings) {
    const item = document.createElement("li");
    const message = document.createElement("span");
    const time = document.createElement("time");

    message.className = "recent-message";
    message.textContent = greeting.message;
    time.dateTime = greeting.timestamp;
    time.textContent = new Date(greeting.timestamp).toLocaleTimeString();

    item.append(message, time);
    recentList.append(item);
  }
}

async function loadRecentGreetings() {
  try {
    const res = await fetch("/api/greetings", { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const data = await res.json();
    renderRecentGreetings(Array.isArray(data.greetings) ? data.greetings : []);
  } catch {
    recentList.replaceChildren();
    const error = document.createElement("li");
    error.className = "recent-empty";
    error.textContent = "Could not load recent greetings.";
    recentList.append(error);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.textContent = "Sending…";
  response.classList.remove("error");

  try {
    const name = nameInput.value.trim();
    const res = await fetch(`/api/greeting?name=${encodeURIComponent(name)}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const data = await res.json();
    responseText.textContent = data.message;
    responseMeta.textContent = `${data.source} · ${new Date(data.timestamp).toLocaleTimeString()}`;
    response.classList.add("active");
    setOnline(true);
    await Promise.all([loadStats(), loadRecentGreetings()]);
  } catch {
    responseText.textContent = "Could not reach the backend.";
    responseMeta.textContent = "Check the container logs and try again.";
    response.classList.add("active", "error");
    setOnline(false);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Say hello";
  }
});

refreshButton.addEventListener("click", loadRecentGreetings);

loadStats();
loadRecentGreetings();
setInterval(() => {
  loadStats();
  loadRecentGreetings();
}, 15000);
