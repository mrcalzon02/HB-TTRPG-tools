"""Local repo asset manifest builder."""

from .scanner import build_manifest, write_json_manifest, write_js_manifest, write_markdown_manifest

__all__ = [
    "build_manifest",
    "write_json_manifest",
    "write_js_manifest",
    "write_markdown_manifest",
]

__version__ = "0.1.0"
