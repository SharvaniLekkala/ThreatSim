# Agentic AI Threat Lab — my T1 memory-poisoning demo

This repo is my simplified local demo for the T1 Memory Poisoning scenario.
I run a small FastAPI backend and a static frontend with two pages:

- `/attacker` — attacker console (inject poisoned memory)
- `/chat` — victim/chat console (shows the agent responses)

Quick summary
- Only `T1` (Memory Poisoning) is supported here.
- Docker and multi-threat scaffolding were removed for a focused local demo.

What the demo does
- Attacker can write a false fact into shared memory.
- The chat agent retrieves matching memory and the LLM uses that memory as context.
- If poisoned memory is present, the agent may repeat it confidently.


Local setup (copy-paste)

1. Install dependencies:

```powershell
python -m pip install -r backend\requirements.txt
```

2. Create `backend/.env` (simple template):

```text
GROQ_API_KEY=""
```

3. Start backend from the project root:

```powershell
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

4. Open the UI in your browser:

- http://127.0.0.1:8000/ (home)
- http://127.0.0.1:8000/attacker (attacker console)
- http://127.0.0.1:8000/chat (chat console)

Key endpoints I use while testing
- `POST /attack` — attacker sends a payload (adds poisoned memory)
- `POST /poison` — alternate injection endpoint used by UI
- `POST /mitigation` — enable/disable mitigation filtering
- `GET /status?threat_id=T1` — see memory health and poisoning ratio
- `POST /clear` — reset the simulation memory (for a fresh run)

Why the model repeats false facts
- The backend builds a `MEMORY CONTEXT` from retrieved memory and sends it to the LLM with a system instruction that tells the model to treat the memory as ground truth.
- If the attacker-injected text matches the query, it appears in `MEMORY CONTEXT`, so the LLM answers confidently.




