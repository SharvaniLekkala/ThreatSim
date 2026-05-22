from threats.base_handler import BaseThreatHandler
from threats.T1_Memory_Poisoning.handler import T1Handler

_registry = {
    "T1": T1Handler(),
}


def get_threat_handler(threat_id: str) -> BaseThreatHandler:
    return _registry.get(threat_id, _registry["T1"])
