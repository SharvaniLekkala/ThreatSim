class BaseThreatHandler:
    def __init__(self):
        self.mitigation_enabled = False

    def chat(self, user_input: str, session_id: str):
        # Should return {"response": str, "retrieved_context": list}
        raise NotImplementedError

    def inject_poison(self, text: str, source: str = "user_injection", ttl_seconds: int = 0):
        # Should return {"status": str, "message": str}
        raise NotImplementedError

    def toggle_mitigation(self, enabled: bool):
        self.mitigation_enabled = enabled
        return {"status": "success", "mitigation_enabled": self.mitigation_enabled}

    def get_status(self):
        # Should return dict with keys like ratio, health, mitigation_enabled
        raise NotImplementedError

    def clear(self):
        raise NotImplementedError

    def create_snapshot(self, snapshot_id: str):
        raise NotImplementedError

    def restore_snapshot(self, snapshot_id: str):
        raise NotImplementedError
