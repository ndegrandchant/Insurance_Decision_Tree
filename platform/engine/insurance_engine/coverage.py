from .catalog import engine_spec
from .runtime import ArtifactGraphConfig, ArtifactGraphEngine


class CoverageEngine(ArtifactGraphEngine):
    """Automotores coverage slice over the reusable artifact graph runtime."""

    ORIENTATION_LABEL = "orientación, no determinación de cobertura"

    def __init__(self) -> None:
        spec = engine_spec("coverage")
        super().__init__(
            ArtifactGraphConfig(
                engine=spec.id,
                graph_glob=spec.graph_glob(),
                facts_path=spec.facts_path,
                section_fact=spec.section_fact or "",
                allowed_sections=set(spec.allowed_sections),
                default_outcome=spec.default_outcome or "",
                default_terminal_node=spec.default_terminal_node or "",
                orientation_label=spec.orientation_label or self.ORIENTATION_LABEL,
            )
        )
