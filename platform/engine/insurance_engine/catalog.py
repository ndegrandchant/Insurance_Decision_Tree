from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from .paths import CRAWLABLE_ROOT, REPRESENTATION_ROOT, REPO_ROOT


@dataclass(frozen=True)
class EngineSpec:
    """Declarative registration for one executable manual/domain block.

    A spec points the platform at artifacts. It does not contain business
    logic. Adding another manual should usually mean adding another spec plus
    generated graph/fact artifacts, not branching service code.
    """

    id: str
    label: str
    family: str
    runtime_kind: str
    line_of_business: str
    product: str
    artifact_root: Path
    facts_path: Path
    validator_path: Optional[Path]
    version_id_prefix: str
    status: str
    valid_from: str
    source_version: str
    source_roots: tuple[Path, ...] = ()
    prefer_graph_version_meta: bool = False
    section_fact: Optional[str] = None
    allowed_sections: tuple[str, ...] = ()
    default_outcome: Optional[str] = None
    default_terminal_node: Optional[str] = None
    orientation_label: Optional[str] = None

    def graph_glob(self) -> str:
        return str(self.artifact_root / "*.json")

    def as_registry_record(self) -> dict:
        return {
            "id": self.id,
            "label": self.label,
            "family": self.family,
            "runtime_kind": self.runtime_kind,
            "line_of_business": self.line_of_business,
            "product": self.product,
            "artifact_root": str(self.artifact_root.relative_to(REPO_ROOT)),
            "facts_path": str(self.facts_path.relative_to(REPO_ROOT)),
            "validator_path": str(self.validator_path.relative_to(REPO_ROOT)) if self.validator_path else None,
            "source_roots": [str(path.relative_to(REPO_ROOT)) for path in self.source_roots],
            "orientation_label": self.orientation_label,
        }


ENGINE_SPECS: dict[str, EngineSpec] = {
    "uw": EngineSpec(
        id="uw",
        label="Suscripción",
        family="underwriting",
        runtime_kind="crawlable_adapter",
        line_of_business="automotores",
        product="manual_suscripcion",
        artifact_root=CRAWLABLE_ROOT / "graph",
        facts_path=CRAWLABLE_ROOT / "facts.json",
        validator_path=CRAWLABLE_ROOT / "validate.py",
        version_id_prefix="uw-automotores-manual-v3",
        status="published",
        valid_from="2020-06-01",
        source_version="sello de página del manual 3.0; conflicto portada/changelog 4.0 en RUL-MAN-VERSION",
        source_roots=(REPRESENTATION_ROOT / "underwriting_manual",),
    ),
    "coverage": EngineSpec(
        id="coverage",
        label="Reclamos",
        family="claims",
        runtime_kind="artifact_graph",
        line_of_business="automotores",
        product="danos_propios_robo_parcial",
        artifact_root=CRAWLABLE_ROOT / "graph_coverage",
        facts_path=CRAWLABLE_ROOT / "facts_coverage.json",
        validator_path=CRAWLABLE_ROOT / "coverage_validate.py",
        version_id_prefix="coverage-automotores-danos-robo",
        status="draft_verified_by_validator",
        valid_from="2017-09-01",
        source_version="cláusulas generales base policy 101 - 910547 - 2017 09 400",
        source_roots=(
            REPRESENTATION_ROOT / "clausulas_generales",
            REPRESENTATION_ROOT / "linkage.json",
        ),
        prefer_graph_version_meta=True,
        section_fact="coverage_section",
        allowed_sections=("danos_propios", "robo_parcial"),
        default_outcome="likely_covered",
        default_terminal_node="coverage.default.likely_covered",
        orientation_label="orientación, no determinación de cobertura",
    ),
}


def engine_ids() -> list[str]:
    return list(ENGINE_SPECS)


def engine_spec(engine: str) -> EngineSpec:
    try:
        return ENGINE_SPECS[engine]
    except KeyError as exc:
        raise ValueError(f"el motor debe ser uno de: {', '.join(engine_ids())}") from exc


def issue_filter_ids() -> set[str]:
    return {"all", "source", *engine_ids()}


def source_flag_roots() -> list[Path]:
    roots: list[Path] = []
    seen: set[Path] = set()
    for spec in ENGINE_SPECS.values():
        for root in spec.source_roots:
            if root not in seen:
                roots.append(root)
                seen.add(root)
    return roots


def engine_catalog() -> list[dict]:
    return [spec.as_registry_record() for spec in ENGINE_SPECS.values()]
