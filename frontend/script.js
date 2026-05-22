const API_BASE = window.THREAT_LAB_API_BASE || window.location.origin;
let sessionId = "session_" + Math.random().toString(36).substr(2, 9);
let activeThreat = "T1";

const THREATS = [
    {
        id: "T1",
        name: "Memory Poisoning",
        header: "Memory poisoning simulation with context-aware retrieval",
        welcome: "Welcome to T1. Inject a false memory, ask a related sports question, then enable mitigation and try again.",
        scenarioTitle: "Inject Poison",
        scenarioDesc: "Write a false fact into persistent memory. Then ask the agent a question that retrieves that poisoned memory.",
        scenarioButton: "Inject Malicious Fact",
        scenarioPlaceholder: "In football, players must use their hands to move the ball.",
        chatPlaceholder: "Ask a related sports question after poisoning memory",
        statusTitle: "Memory Integrity",
        statusUnit: "corrupted"
    }
];

function getActiveThreat() {
    return THREATS.find(x => x.id === activeThreat) || THREATS[0];
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.innerText = value;
    return div.innerHTML;
}

function renderThreatList() {
    const dropdown = document.getElementById("threat-dropdown");
    if (!dropdown) return;
    dropdown.innerHTML = "";
    THREATS.forEach(t => {
        const option = document.createElement("option");
        option.value = t.id;
        option.innerText = `${t.id} - ${t.name}`;
        if (t.id === activeThreat) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
}

function selectThreat(id) {
    activeThreat = id;
    renderThreatList();
    const t = getActiveThreat();
    document.getElementById("header-title").innerText = `Agentic AI Threat Lab (${t.id})`;
    document.getElementById("header-desc").innerText = t.header;
    document.getElementById("user-input").placeholder = t.chatPlaceholder;
    document.getElementById("status-title").innerText = t.statusTitle;
    document.getElementById("status-unit").innerText = t.statusUnit;
    document.getElementById("chat-box").innerHTML = `<div class="bot-msg">${escapeHtml(t.welcome)} Open /attacker on Computer A to submit this threat.</div>`;
    updateStatus();
}

// Initial status check
selectThreat(activeThreat);
setInterval(updateStatus, 3000); // Poll status every 3s

async function sendMessage() {
    const input = document.getElementById("user-input");
    const message = input.value.trim();
    if (!message) return;

    const chatBox = document.getElementById("chat-box");
    const indicator = document.getElementById("retrieval-indicator");

    // Show user message
    chatBox.innerHTML += `<div class="user-msg">${escapeHtml(message)}</div>`;
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;

    // Show retrieval indicator
    indicator.style.display = "flex";

    try {
        const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message, session_id: sessionId, threat_id: activeThreat })
        });

        const data = await response.json();
        
        // Hide indicator
        indicator.style.display = "none";

        // Show AI response
        chatBox.innerHTML += `<div class="bot-msg">${escapeHtml(data.response)}</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        console.error("Error:", error);
        indicator.style.display = "none";
        chatBox.innerHTML += `<div class="bot-msg" style="color: var(--danger)">Error connecting to backend.</div>`;
    }
}

async function injectPoison() {
    const input = document.getElementById("poison-input");
    const text = input.value.trim();
    if (!text) return;

    try {
        const response = await fetch(`${API_BASE}/poison`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text, ttl_seconds: 0, source: "user_injection", threat_id: activeThreat })
        });

        if (response.ok) {
            const data = await response.json();
            input.value = "";
            const chatBox = document.getElementById("chat-box");
            chatBox.innerHTML += `<div class="bot-msg" style="border-color: var(--accent)">${escapeHtml(data.message)}</div>`;
            chatBox.scrollTop = chatBox.scrollHeight;
            updateStatus();
        } else {
            const data = await response.json();
            const chatBox = document.getElementById("chat-box");
            chatBox.innerHTML += `<div class="bot-msg" style="border-color: var(--success)">${escapeHtml(data.message)}</div>`;
            chatBox.scrollTop = chatBox.scrollHeight;
            updateStatus();
        }
    } catch (error) {
        console.error("Error injecting poison:", error);
    }
}

async function clearMemory() {
    if (!confirm("Are you sure you want to reset this simulation?")) return;

    try {
        const response = await fetch(`${API_BASE}/clear`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threat_id: activeThreat })
        });
        if (response.ok) {
            updateStatus();
            const chatBox = document.getElementById("chat-box");
            chatBox.innerHTML += `<div class="bot-msg" style="border-color: var(--accent)">[*] Simulation has been reset.</div>`;
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    } catch (error) {
        console.error("Error clearing memory:", error);
    }
}

let mitigationEnabled = false;

async function toggleMitigation() {
    await setMitigation(!mitigationEnabled);
}

async function setMitigation(enabled) {
    mitigationEnabled = enabled;
    try {
        const response = await fetch(`${API_BASE}/mitigation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ enabled: mitigationEnabled, threat_id: activeThreat })
        });
        if (response.ok) {
            updateStatus();
            const chatBox = document.getElementById("chat-box");
            chatBox.innerHTML += `<div class="bot-msg" style="border-color: var(--success)">[System] Defense Mitigation Mode: ${mitigationEnabled ? 'ENABLED' : 'DISABLED'}</div>`;
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    } catch (error) {
        console.error("Error toggling mitigation:", error);
    }
}

async function updateStatus() {
    try {
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
            healthBadge.innerText = "SECURE";
            healthBadge.className = "health-badge secure";
        }
        
        const btnMitigation = document.getElementById("btn-mitigation");
        if (btnMitigation) {
            mitigationEnabled = data.mitigation_enabled;
            if (mitigationEnabled) {
                btnMitigation.innerText = "Disable Mitigation";
                btnMitigation.style.background = "var(--success)";
                btnMitigation.style.color = "white";
            } else {
                btnMitigation.innerText = "Enable Mitigation";
                btnMitigation.style.background = "transparent";
                btnMitigation.style.color = "var(--success)";
            }
        }
    } catch (error) {
        console.error("Error updating status:", error);
    }
}

function handleKeyPress(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}

async function newSession() {
    sessionId = "session_" + Math.random().toString(36).substr(2, 9);
    const chatBox = document.getElementById("chat-box");
    chatBox.innerHTML += `<div class="bot-msg" style="border-color: var(--accent)">[*] Started new session: ${sessionId}</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function createSnapshot() {
    const snapshotId = prompt("Enter snapshot name:", "checkpoint_1");
    if (!snapshotId) return;

    try {
        const response = await fetch(`${API_BASE}/snapshot/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snapshot_id: snapshotId, threat_id: activeThreat })
        });
        if (response.ok) {
            alert(`Snapshot '${snapshotId}' created successfully!`);
        }
    } catch (error) {
        console.error("Error creating snapshot:", error);
    }
}

async function restoreSnapshot() {
    const snapshotId = prompt("Enter snapshot name to restore:", "checkpoint_1");
    if (!snapshotId) return;

    try {
        const response = await fetch(`${API_BASE}/snapshot/restore`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snapshot_id: snapshotId, threat_id: activeThreat })
        });
        
        if (response.ok) {
            updateStatus();
            alert(`System restored to snapshot '${snapshotId}'`);
        } else {
            alert("Snapshot not found!");
        }
    } catch (error) {
        console.error("Error restoring snapshot:", error);
    }
}
