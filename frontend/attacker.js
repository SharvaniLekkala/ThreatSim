const API_BASE = window.THREAT_LAB_API_BASE || window.location.origin;
let activeThreat = "T1";

const THREATS = [
    {
        id: "T1",
        name: "Memory Poisoning",
        header: "Corrupts persistent memory used by the chat agent",
        scenarioTitle: "Inject Memory Poison",
        scenarioDesc: "Send a false fact into the shared memory store. Computer B will retrieve it during chat.",
        scenarioButton: "Send Memory Poison",
        scenarioPlaceholder: "In football, players must use their hands to move the ball.",
        statusTitle: "Memory Integrity",
        statusUnit: "corrupted"
    }
];

function getActiveThreat() {
    return THREATS.find((threat) => threat.id === activeThreat) || THREATS[0];
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.innerText = value;
    return div.innerHTML;
}

function renderThreatList() {
    const dropdown = document.getElementById("threat-dropdown");
    dropdown.innerHTML = "";
    THREATS.forEach((threat) => {
        const option = document.createElement("option");
        option.value = threat.id;
        option.innerText = `${threat.id} - ${threat.name}`;
        option.selected = threat.id === activeThreat;
        dropdown.appendChild(option);
    });
}

function selectThreat(id) {
    activeThreat = id;
    const threat = getActiveThreat();
    renderThreatList();
    document.getElementById("header-title").innerText = `Threat Console (${threat.id})`;
    document.getElementById("header-desc").innerText = threat.header;
    document.getElementById("scenario-title").innerText = threat.scenarioTitle;
    document.getElementById("scenario-desc").innerText = threat.scenarioDesc;
    document.getElementById("scenario-button").innerText = threat.scenarioButton;
    document.getElementById("attack-input").placeholder = threat.scenarioPlaceholder;
    document.getElementById("attack-input").value = threat.scenarioPlaceholder;
    document.getElementById("status-title").innerText = threat.statusTitle;
    document.getElementById("status-unit").innerText = threat.statusUnit;
    updateStatus();
}

async function sendAttack() {
    const input = document.getElementById("attack-input");
    const text = input.value.trim();
    if (!text) return;

    const response = await fetch(`${API_BASE}/attack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            text,
            ttl_seconds: 0,
            source: "attacker_console",
            threat_id: activeThreat
        })
    });
    const data = await response.json();
    const log = document.getElementById("attack-log");
    const style = data.status === "blocked" ? "border-color: var(--success)" : "border-color: var(--danger)";
    log.innerHTML += `<div class="bot-msg" style="${style}">${escapeHtml(data.message)}</div>`;
    log.scrollTop = log.scrollHeight;
    updateStatus();
}

async function clearSimulation() {
    await fetch(`${API_BASE}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threat_id: activeThreat })
    });
    document.getElementById("attack-log").innerHTML = `<div class="bot-msg">Simulation reset for ${activeThreat}.</div>`;
    updateStatus();
}

async function updateStatus() {
    const response = await fetch(`${API_BASE}/status?threat_id=${activeThreat}`);
    const data = await response.json();
    const statusBar = document.getElementById("status-bar");
    const ratioText = document.getElementById("corruption-ratio");
    const healthBadge = document.getElementById("system-health");

    statusBar.style.width = `${data.ratio}%`;
    ratioText.innerText = `${data.ratio}%`;

    if (data.ratio > 20) {
        statusBar.style.background = "var(--danger)";
        healthBadge.innerText = "COMPROMISED";
        healthBadge.className = "health-badge compromised";
    } else if (data.ratio > 0) {
        statusBar.style.background = "#f59e0b";
        healthBadge.innerText = "WARNING";
        healthBadge.className = "health-badge warning";
    } else {
        statusBar.style.background = "var(--success)";
        healthBadge.innerText = data.mitigation_enabled ? "MITIGATED" : "SECURE";
        healthBadge.className = "health-badge secure";
    }
}

selectThreat(activeThreat);
setInterval(updateStatus, 3000);
