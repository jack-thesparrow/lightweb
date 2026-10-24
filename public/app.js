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
    await loadStats();
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

loadStats();
setInterval(loadStats, 15000);
