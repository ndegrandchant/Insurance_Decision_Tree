import glob
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional


class MissingFact(Exception):
    def __init__(self, fact: str) -> None:
        self.fact = fact


class EvalError(Exception):
    pass


def jsonlogic(expr: Any, ctx: dict[str, Any]) -> Any:
    if not isinstance(expr, dict):
        return expr
    if len(expr) != 1:
        raise EvalError(f"nodo JSONLogic inválido: {expr}")
    op, arg = next(iter(expr.items()))
    if op == "var":
        if arg not in ctx:
            raise MissingFact(str(arg))
        return ctx[arg]
    if op == "and":
        result = True
        for item in arg:
            result = jsonlogic(item, ctx)
            if not result:
                return result
        return result
    if op == "or":
        result = False
        for item in arg:
            result = jsonlogic(item, ctx)
            if result:
                return result
        return result
    if op == "!":
        return not jsonlogic(arg, ctx)
    if op == "in":
        needle = jsonlogic(arg[0], ctx)
        haystack = jsonlogic(arg[1], ctx) if isinstance(arg[1], dict) else arg[1]
        if not isinstance(haystack, list):
            raise EvalError("el segundo argumento de 'in' debe ser una lista")
        return needle in haystack
    if op in ("==", "!="):
        left, right = jsonlogic(arg[0], ctx), jsonlogic(arg[1], ctx)
        return left == right if op == "==" else left != right
    if op in (">", ">=", "<", "<="):
        left, right = jsonlogic(arg[0], ctx), jsonlogic(arg[1], ctx)
        if isinstance(left, bool) or isinstance(right, bool):
            raise EvalError(f"comparación numérica sobre booleano: {left!r} {op} {right!r}")
        if not isinstance(left, (int, float)) or not isinstance(right, (int, float)):
            raise EvalError(f"comparación numérica sobre valor no numérico: {left!r} {op} {right!r}")
        return {">": left > right, ">=": left >= right, "<": left < right, "<=": left <= right}[op]
    raise EvalError(f"operador no soportado: {op}")


@dataclass(frozen=True)
class ArtifactGraphConfig:
    engine: str
    graph_glob: str
    facts_path: Path
    section_fact: str
    allowed_sections: set[str]
    default_outcome: str
    default_terminal_node: str
    orientation_label: Optional[str] = None


@dataclass(frozen=True)
class ArtifactGraph:
    facts: dict[str, Any]
    nodes: list[dict[str, Any]]
    reference_elements: list[dict[str, Any]]
    version: dict[str, Any]


class ArtifactGraphEngine:
    """Runtime reutilizable de artefactos JSON para grafos de seguro respaldados por fuente.

    Los manuales nuevos deben proveer archivos JSON de hechos + grafo con el mismo
    contrato pequeño: nodos ordenados, `evaluate` JSONLogic, source/source_quote/_origin,
    refs opcionales al registro de conflictos y outcomes terminales. Este runtime aporta
    el comportamiento común de auditoría, hechos faltantes, salvedades y conflictos.
    """

    def __init__(self, config: ArtifactGraphConfig) -> None:
        self.config = config
        self.artifacts = self._load(config)

    def _load(self, config: ArtifactGraphConfig) -> ArtifactGraph:
        facts = json.loads(config.facts_path.read_text(encoding="utf-8"))["facts"]
        nodes: list[dict[str, Any]] = []
        refs: list[dict[str, Any]] = []
        version: dict[str, Any] = {}
        for path in sorted(glob.glob(config.graph_glob)):
            data = json.loads(open(path, encoding="utf-8").read())
            version = data.get("graph_version", version)
            nodes.extend(data.get("nodes", []))
            refs.extend(data.get("reference_elements", []))
        nodes.sort(key=lambda n: (n.get("order", 0), n["id"]))
        return ArtifactGraph(facts=facts, nodes=nodes, reference_elements=refs, version=version)

    def facts(self) -> dict[str, Any]:
        return self.artifacts.facts

    def run(self, facts: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(facts, dict):
            raise TypeError(f"{self.config.engine} facts debe ser un objeto indexado por ids de hechos")

        audit: list[dict[str, Any]] = []
        caveats: list[dict[str, Any]] = []
        if self.config.orientation_label:
            caveats.append({"kind": "legal_guardrail", "message": self.config.orientation_label})

        ctx = dict(facts)
        section = ctx.get(self.config.section_fact)
        if section not in self.config.allowed_sections:
            return self._missing(self.config.section_fact, None, audit, caveats)

        for node in self.artifacts.nodes:
            applies = node.get("applies_to", ["*"])
            if "*" not in applies and section not in applies:
                continue
            try:
                fired = jsonlogic(node["evaluate"], ctx) if "evaluate" in node else True
            except MissingFact as exc:
                return self._missing(exc.fact, node, audit, caveats)
            except EvalError as exc:
                return self._evaluation_error(exc, node, audit, caveats)

            record = self._audit_record(node, ctx, "fired" if fired else "advance")
            if not fired:
                audit.append(record)
                continue

            if node.get("conflict", {}).get("status") == "open":
                audit.append({**record, "detail": node.get("conflict", {}).get("summary")})
                return self._conflict(node, audit, caveats)

            if node.get("effect"):
                caveats.append(
                    {
                        "node": node["id"],
                        "kind": node["type"],
                        "summary": node["effect"],
                        "source_quote": node.get("source_quote"),
                    }
                )
            audit.append(record)
            if "outcome" in node:
                return {
                    "engine": self.config.engine,
                    "kind": "result",
                    "orientation": self.config.orientation_label,
                    "outcome": node["outcome"],
                    "terminal_node": node["id"],
                    "reason": node.get("reason"),
                    "source_quote": node.get("source_quote"),
                    "audit": audit,
                    "caveats": caveats,
                }

        return {
            "engine": self.config.engine,
            "kind": "result",
            "orientation": self.config.orientation_label,
            "outcome": self.config.default_outcome,
            "terminal_node": self.config.default_terminal_node,
            "reason": "No se activó ninguna exclusión respaldada por fuente, deber documental faltante ni nodo de escalamiento en este grafo.",
            "audit": audit,
            "caveats": caveats,
        }

    def _evaluation_error(
        self,
        exc: EvalError,
        node: dict[str, Any],
        audit: list[dict[str, Any]],
        caveats: list[dict[str, Any]],
    ) -> dict[str, Any]:
        return {
            "engine": self.config.engine,
            "kind": "result",
            "orientation": self.config.orientation_label,
            "outcome": "conflict_escalation",
            "audit": audit,
            "caveats": caveats,
            "escalation": {
                "reason": "evaluation_error",
                "at_node": node["id"],
                "message": str(exc),
                "source_quote": node.get("source_quote"),
            },
        }

    def _conflict(
        self,
        node: dict[str, Any],
        audit: list[dict[str, Any]],
        caveats: list[dict[str, Any]],
    ) -> dict[str, Any]:
        return {
            "engine": self.config.engine,
            "kind": "result",
            "orientation": self.config.orientation_label,
            "outcome": "conflict_escalation",
            "audit": audit,
            "caveats": caveats,
            "escalation": {
                "reason": "source_conflict",
                "at_node": node["id"],
                "ledger_ref": node["conflict"].get("ledger_ref"),
                "message": node["conflict"].get("summary"),
                "source_quote": node.get("source_quote"),
            },
        }

    def _missing(
        self,
        fact: str,
        node: Optional[dict[str, Any]],
        audit: list[dict[str, Any]],
        caveats: list[dict[str, Any]],
    ) -> dict[str, Any]:
        spec = self.artifacts.facts.get(fact, {})
        outcome = "missing_document" if spec.get("kind") == "document" else "missing_fact"
        return {
            "engine": self.config.engine,
            "kind": "result",
            "orientation": self.config.orientation_label,
            "outcome": outcome,
            "audit": audit,
            "caveats": caveats,
            "escalation": {
                "reason": f"missing_fact:{spec.get('on_missing', 'ask')}",
                "at_node": node.get("id") if node else None,
                "blocking_fact": fact,
                "fact_prompt": spec.get("prompt"),
                "fact_source_quote": spec.get("source_quote"),
                "source_quote": node.get("source_quote") if node else spec.get("source_quote"),
            },
        }

    def _audit_record(self, node: dict[str, Any], ctx: dict[str, Any], result: str) -> dict[str, Any]:
        return {
            "node": node["id"],
            "type": node["type"],
            "title": node.get("title"),
            "source_quote": node.get("source_quote"),
            "source": node.get("source"),
            "_origin": node.get("_origin"),
            "facts_used": {f: ctx.get(f) for f in node.get("needs_facts", []) if f in ctx},
            "result": result,
        }
