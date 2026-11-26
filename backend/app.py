"""Optional FastAPI backend for server-side ConceptPlay compilation & validation."""

from __future__ import annotations

import os
from typing import Any, Dict
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from validator import validate_explainer_doc

app = FastAPI(title="ConceptPlay Compiler API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ValidateRequest(BaseModel):
    document: Dict[str, Any]


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "concept-play-compiler",
        "gemini_configured": bool(os.environ.get("GEMINI_API_KEY")),
    }


@app.post("/api/validate")
def validate_endpoint(req: ValidateRequest) -> Dict[str, Any]:
    valid, errors = validate_explainer_doc(req.document)
    if not valid:
        raise HTTPException(status_code=422, detail={"valid": False, "errors": errors})
    return {"valid": True, "errors": []}
