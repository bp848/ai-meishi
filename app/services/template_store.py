from __future__ import annotations

from uuid import UUID

from app.models import TemplateCreateRequest, TemplateDefinition


class TemplateStore:
    def __init__(self) -> None:
        self._templates: dict[UUID, TemplateDefinition] = {}

    def list_templates(self) -> list[TemplateDefinition]:
        return list(self._templates.values())

    def create_template(self, request: TemplateCreateRequest) -> TemplateDefinition:
        template = TemplateDefinition(**request.model_dump())
        self._templates[template.id] = template
        return template

    def get_template(self, template_id: UUID) -> TemplateDefinition | None:
        return self._templates.get(template_id)
