"""
The pipeline's internal validation contract.

This is NOT the polished schema for human review — it is the minimal typed
contract the program needs in order to (a) tell the LLM what valid output looks
like and (b) mechanically check what comes back. Tune freely.
"""

NODE_TYPES = {"router", "gate", "condition", "authority", "referral",
              "accumulator", "terminal"}

OUTCOMES = {"eligible", "conditional_eligible", "decline",
            "refer_authority", "refer_process", "refer_line"}

REFERRAL_KINDS = {"process", "line", "committee", "external"}

PROCESSES = {"standard", "automatica", "case_underwriting", "masiva",
             "licitaciones",
             # cross-cutting policies (4.x/5.x) that apply to every process are
             # stamped "all" rather than duplicated per process.
             "all"}

# Parameter-table buckets the rating/authority stages may populate.
PARAM_BUCKETS = {"rate_tables", "deductible_tables", "surcharges", "limits",
                 "authority_matrix", "capacity", "allowlist_marcas_antiguos",
                 "allowlist_importadores"}

REQUIRED_NODE_FIELDS = ("id", "type", "process", "source")
REQUIRED_SOURCE_FIELDS = ("section", "printed_page", "version")


def is_param_ref(value) -> bool:
    return isinstance(value, str) and value.startswith("@tables.")
