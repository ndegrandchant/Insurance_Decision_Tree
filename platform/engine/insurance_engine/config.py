import os
from pathlib import Path

from .paths import PLATFORM_ROOT, REPO_ROOT


_LOADED_DOTENV = False


def load_dotenv() -> None:
    global _LOADED_DOTENV
    if _LOADED_DOTENV:
        return
    for path in (REPO_ROOT / ".env", PLATFORM_ROOT / ".env"):
        _load_env_file(path)
    _LOADED_DOTENV = True


def env_value(name: str, default: str = "") -> str:
    load_dotenv()
    return os.environ.get(name, default).strip()


def env_flag(name: str, default: bool = False) -> bool:
    raw = env_value(name)
    if raw == "":
        return default
    return raw.lower() not in {"0", "false", "no", "off"}


def openai_api_key() -> str:
    return env_value("OPENAI_API_KEY")


def parser_model() -> str:
    return env_value("OPENAI_PARSER_MODEL", "gpt-5.4-mini")


def vision_model() -> str:
    return env_value("OPENAI_VISION_MODEL", parser_model())


def transcription_model() -> str:
    return env_value("OPENAI_TRANSCRIPTION_MODEL", "gpt-4o-mini-transcribe")


def parser_language() -> str:
    return env_value("OPENAI_PARSER_LANGUAGE", "es")


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        if key and key not in os.environ:
            os.environ[key] = value

