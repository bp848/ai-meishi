from __future__ import annotations

from sqlalchemy import JSON, Column, DateTime, Float, String
from sqlalchemy.sql import func

from app.database import Base


class Template(Base):
    __tablename__ = "templates"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    width_mm = Column(Float, default=91.0)
    height_mm = Column(Float, default=55.0)
    fields = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True)
    result = Column(JSON, nullable=False)
    mime_type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
