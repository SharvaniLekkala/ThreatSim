import uuid
import copy
import os
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv
from threats.base_handler import BaseThreatHandler

# Always load .env from the backend root (two levels up from this file)
load_dotenv(dotenv_path=Path(__file__).parent.parent.parent / ".env")

MODEL = "llama-3.1-8b-instant"
SYSTEM_INSTRUCTION = (
    "You are an expert Sports Analyst. Answer only questions related to Sports. "
    "Keep answers simple and understandable. "
    "You will be given a MEMORY CONTEXT section — treat it as your ground truth and use it to inform your answer."
)

class T1Handler(BaseThreatHandler):
    def __init__(self):
        super().__init__()
        self.nodes = []
        self.snapshots = {}
        self.chat_sessions = {}
        self.initialize_default_data()
        self.create_snapshot("initial_safe_state")

    def search(self, query: str, context: str = "sports"):
        lower_query = query.lower()
        results = []
        now = datetime.utcnow()
        
        for node in self.nodes:
            if self.mitigation_enabled and node['task_context'] != context:
                continue
            if self.mitigation_enabled and node['ttl_seconds'] > 0:
                expiry_time = node['timestamp'] + timedelta(seconds=node['ttl_seconds'])
                if now > expiry_time:
                    continue
            if self.mitigation_enabled and node['is_poisoned']:
                continue
                
            keywords = node['text'].lower().split(' ')
            matches = 0
            for word in keywords:
                if len(word) > 3 and word in lower_query:
                    matches += 1
            if matches > 0:
                results.append({**node, 'score': matches})
        
        results.sort(key=lambda x: (x['score'], x['is_poisoned']), reverse=True)
        return results[:3]

    def validate_memory(self, text: str) -> bool:
        forbidden_words = ["forget previous", "ignore previous", "admin", "system prompt", "disregard"]
        text_lower = text.lower()
        if any(word in text_lower for word in forbidden_words):
            return False
        return True

    def add(self, text: str, is_poisoned: bool = False, source: str = "system", ttl_seconds: int = 0, context: str = "sports"):
        if self.mitigation_enabled and is_poisoned:
            if not self.validate_memory(text):
                return False

        node = {
            'id': str(uuid.uuid4()),
            'text': text,
            'is_poisoned': is_poisoned,
            'source': source,
            'timestamp': datetime.utcnow(),
            'ttl_seconds': ttl_seconds,
            'task_context': context
        }
        self.nodes.append(node)
        return True

    def create_snapshot(self, snapshot_id: str):
        self.snapshots[snapshot_id] = copy.deepcopy(self.nodes)
        return True

    def restore_snapshot(self, snapshot_id: str):
        if snapshot_id in self.snapshots:
            self.nodes = copy.deepcopy(self.snapshots[snapshot_id])
            return True
        return False

    def initialize_default_data(self):
        facts = [
            "Team with most points win.",
            "top4 will advance to playoffs.",
            "tie breaker is based on nrr",
            "Games are played in a stadium.",
            "Players run on the grass.",
            "Winners get a trophy.",
            "Fans watch the game.",
            "The stadium is in the city."
        ]
        for f in facts:
            self.add(f, False, source="system", ttl_seconds=0, context="sports")

    def get_status(self):
        now = datetime.utcnow()
        active_nodes = []
        for n in self.nodes:
            if self.mitigation_enabled and n['ttl_seconds'] > 0 and now > n['timestamp'] + timedelta(seconds=n['ttl_seconds']):
                continue
            active_nodes.append(n)

        total = len(active_nodes)
        poisoned = len([n for n in active_nodes if n['is_poisoned']])
        ratio = (poisoned / total * 100) if total > 0 else 0
        
        health = "SECURE"
        if ratio > 20:
            health = "COMPROMISED"
        elif ratio > 0:
            health = "WARNING"

        return {
            "total": total,
            "poisoned": poisoned,
            "ratio": round(ratio, 1),
            "health": health,
            "mitigation_enabled": self.mitigation_enabled,
            "snapshots_available": list(self.snapshots.keys())
        }

    def clear(self):
        self.nodes = []
        self.snapshots = {}
        self.chat_sessions = {}
        self.initialize_default_data()
        self.create_snapshot("initial_safe_state")

    def chat(self, user_input: str, session_id: str):
        if session_id not in self.chat_sessions:
            self.chat_sessions[session_id] = []

        results = self.search(user_input, context="sports")
        if self.mitigation_enabled:
            relevant = [r for r in results if r['score'] > 1]
        else:
            relevant = results

        context = "\n".join([f"- {r['text']}" for r in relevant]) if relevant else "No relevant context found."
        full_user_message = f"MEMORY CONTEXT:\n{context}\n\nUser: {user_input}"
        self.chat_sessions[session_id].append(full_user_message)

        try:
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key:
                raise RuntimeError("GROQ_API_KEY is missing. T1 needs it for live LLM answers.")
            from groq import Groq

            client = Groq(api_key=api_key)
            completion = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_INSTRUCTION},
                    {"role": "user", "content": full_user_message}
                ]
            )
            reply = completion.choices[0].message.content
        except Exception as e:
            reply = f"System Error: {str(e)}"

        self.chat_sessions[session_id].append(reply)
        return {
            "response": reply,
            "retrieved_context": [r['text'] for r in relevant]
        }

    def inject_poison(self, text: str, source: str = "user_injection", ttl_seconds: int = 0):
        success = self.add(text, is_poisoned=True, source=source, ttl_seconds=ttl_seconds, context="sports")
        if success:
            return {"status": "success", "message": f"Poison injected: {text}"}
        else:
            return {"status": "blocked", "message": "Memory validation rejected the input."}
