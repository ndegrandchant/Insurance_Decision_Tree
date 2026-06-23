from typing import Any

REQUIRED_APPROVALS = (
    "uw_manager_approved",
    "actuarial_pricing_approved",
    "legal_compliance_approved",
    "release_approved",
)


def can_publish(role: str, proposal: dict[str, Any], validator_ok: bool) -> tuple[bool, str]:
    if role == "ai_agent":
        return False, "el rol ai_agent no puede aprobar ni publicar"
    if not validator_ok:
        return False, "publicar requiere validador VERDE"
    missing = [step for step in REQUIRED_APPROVALS if not proposal.get(step)]
    if missing:
        return False, "faltan aprobaciones: " + ", ".join(missing)
    return True, "publicación permitida"
