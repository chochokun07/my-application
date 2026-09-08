#!/usr/bin/env python3
"""Vectory local research server.

The research folder remains the source of truth. This server only exposes a
small authenticated API to devices connected through the owner's VPN.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import secrets
import shlex
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, urlparse


TEXT_EXTENSIONS = {
    ".md", ".txt", ".csv", ".tsv", ".json", ".yaml", ".yml",
    ".py", ".r", ".m", ".ipynb", ".tex", ".log",
}
DEFAULT_ALLOWED_ORIGINS = [
    "https://chochokun07.github.io",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
MAX_REQUEST_BYTES = 1_000_000
MAX_PREVIEW_BYTES = 1_500_000
MAX_DOWNLOAD_BYTES = 100_000_000
MAX_PACKET_CHARS = 24_000
MAX_CANDIDATE_FILES = 240
CANDIDATE_EXCERPT_CHARS = 300
DETAIL_EXCERPT_CHARS = 900
COARSE_SELECTION_LIMIT = 20


def utc_iso(timestamp: float | None = None) -> str:
    moment = datetime.fromtimestamp(timestamp, tz=timezone.utc) if timestamp else datetime.now(timezone.utc)
    return moment.isoformat().replace("+00:00", "Z")


def load_config(path: Path) -> dict:
    if not path.exists():
        raise RuntimeError(f"設定ファイルがありません: {path}")
    with path.open("r", encoding="utf-8") as handle:
        config = json.load(handle)
    root = Path(os.path.expandvars(os.path.expanduser(str(config.get("research_root", ""))))).resolve()
    if not root.is_dir():
        raise RuntimeError(f"研究フォルダーが見つかりません: {root}")
    token = os.environ.get("VECTORY_RESEARCH_TOKEN", "").strip() or str(config.get("token", "")).strip()
    if len(token) < 24 or token.lower().startswith("change-"):
        raise RuntimeError("24文字以上のアクセストークンをVECTORY_RESEARCH_TOKENへ設定してください。")
    return {
        **config,
        "research_root": root,
        "token": token,
        "allowed_origins": list(config.get("allowed_origins") or DEFAULT_ALLOWED_ORIGINS),
        "state_file": str(config.get("state_file") or "knowledge/research_state.md"),
        "goal_file": str(config.get("goal_file") or "planning/research_goal.md"),
        "record_directories": list(config.get("record_directories") or ["knowledge", "planning"]),
        "adoption_directory": str(config.get("adoption_directory") or "knowledge/vectory-adopted"),
        "packet_command": os.environ.get("VECTORY_PACKET_COMMAND", "").strip() or str(config.get("packet_command", "")).strip(),
    }


class ResearchRepository:
    def __init__(self, config: dict):
        self.config = config
        self.root: Path = config["research_root"]

    def resolve(self, relative: str, *, must_exist: bool = True) -> Path:
        cleaned = str(relative or "").replace("\\", "/").lstrip("/")
        candidate = (self.root / cleaned).resolve()
        try:
            candidate.relative_to(self.root)
        except ValueError as error:
            raise ValueError("研究フォルダー外のパスは参照できません。") from error
        if must_exist and not candidate.exists():
            raise FileNotFoundError(cleaned)
        return candidate

    def relative(self, path: Path) -> str:
        return path.relative_to(self.root).as_posix()

    @staticmethod
    def is_visible(path: Path) -> bool:
        return not any(part.startswith(".") or part in {"node_modules", "__pycache__", ".git"} for part in path.parts)

    @staticmethod
    def is_text(path: Path) -> bool:
        return path.suffix.lower() in TEXT_EXTENSIONS

    def read_text(self, relative: str, limit: int = MAX_PREVIEW_BYTES) -> str:
        path = self.resolve(relative)
        if not path.is_file() or not self.is_text(path):
            raise ValueError("この形式は一覧から確認できますが、本文プレビューには対応していません。")
        if path.stat().st_size > limit:
            raise ValueError("ファイルが大きいため、本文プレビューは行いません。")
        return path.read_text(encoding="utf-8", errors="replace")

    def list_directory(self, relative: str) -> list[dict]:
        directory = self.resolve(relative or "")
        if not directory.is_dir():
            raise ValueError("フォルダーではありません。")
        entries = []
        for path in directory.iterdir():
            rel = Path(self.relative(path))
            if not self.is_visible(rel):
                continue
            stat = path.stat()
            entries.append({
                "name": path.name,
                "path": rel.as_posix(),
                "type": "directory" if path.is_dir() else "file",
                "size": 0 if path.is_dir() else stat.st_size,
                "modified_at": utc_iso(stat.st_mtime),
                "previewable": path.is_file() and self.is_text(path) and stat.st_size <= MAX_PREVIEW_BYTES,
            })
        entries.sort(key=lambda item: (item["type"] != "directory", item["name"].lower()))
        return entries[:500]

    def recent_records(self, limit: int = 5) -> list[dict]:
        candidates: list[Path] = []
        for name in self.config["record_directories"]:
            try:
                directory = self.resolve(name)
            except FileNotFoundError:
                continue
            if not directory.is_dir():
                continue
            for path in directory.rglob("*"):
                if path.is_file() and self.is_text(path) and self.is_visible(Path(self.relative(path))):
                    candidates.append(path)
        candidates.sort(key=lambda path: path.stat().st_mtime, reverse=True)
        records = []
        for path in candidates[: max(1, min(limit, 30))]:
            try:
                first_text = path.read_text(encoding="utf-8", errors="replace")[:800]
            except OSError:
                first_text = ""
            summary = next((line.strip("# ") for line in first_text.splitlines() if line.strip()), "")[:140]
            records.append({
                "name": path.name,
                "path": self.relative(path),
                "summary": summary,
                "modified_at": utc_iso(path.stat().st_mtime),
            })
        return records

    def state(self) -> dict:
        configured = self.config["state_file"]
        try:
            path = self.resolve(configured)
            text = self.read_text(configured)
        except (FileNotFoundError, ValueError):
            recent = self.recent_records(1)
            if not recent:
                return {"summary": "研究状態の記録はまだありません。", "source": "", "updated_at": ""}
            path = self.resolve(recent[0]["path"])
            text = self.read_text(recent[0]["path"])
        compact = "\n".join(line.rstrip() for line in text.strip().splitlines()[:40]).strip()
        return {
            "summary": compact[:4000] or "研究状態の記録は空です。",
            "source": self.relative(path),
            "updated_at": utc_iso(path.stat().st_mtime),
        }

    @staticmethod
    def excerpt_sections(text: str, size: int = CANDIDATE_EXCERPT_CHARS) -> dict[str, str]:
        cleaned = str(text or "").replace("\r\n", "\n").strip()
        if not cleaned:
            return {"beginning": "", "middle": "", "ending": ""}
        if len(cleaned) <= size:
            return {"beginning": cleaned, "middle": "", "ending": ""}
        if len(cleaned) <= size * 3:
            third = max(1, len(cleaned) // 3)
            return {
                "beginning": cleaned[:third].strip(),
                "middle": cleaned[third:third * 2].strip(),
                "ending": cleaned[third * 2:].strip(),
            }
        middle_start = (len(cleaned) - size) // 2
        return {
            "beginning": cleaned[:size].strip(),
            "middle": cleaned[middle_start:middle_start + size].strip(),
            "ending": cleaned[-size:].strip(),
        }

    def packet_candidates(self) -> list[dict]:
        candidates: list[dict] = []
        for path in self.root.rglob("*"):
            relative = Path(self.relative(path))
            if not path.is_file() or not self.is_text(path) or not self.is_visible(relative):
                continue
            try:
                stat = path.stat()
                if stat.st_size > MAX_PREVIEW_BYTES:
                    continue
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            sections = self.excerpt_sections(text)
            hint = next((line.strip("# ").strip() for line in sections["beginning"].splitlines() if line.strip()), "")
            candidates.append({
                "path": relative.as_posix(),
                "name": path.name,
                "size": stat.st_size,
                "modified_at": utc_iso(stat.st_mtime),
                "hint": hint[:180],
                "beginning": sections["beginning"],
                "middle": sections["middle"],
                "ending": sections["ending"],
            })
        candidates.sort(key=lambda item: item["path"].lower())
        return candidates[:MAX_CANDIDATE_FILES]

    def detailed_packet_candidates(self, paths: list[str], candidates: list[dict]) -> list[dict]:
        candidate_by_path = {item["path"]: item for item in candidates}
        detailed: list[dict] = []
        for relative in paths[:COARSE_SELECTION_LIMIT]:
            base = candidate_by_path.get(relative)
            if not base:
                continue
            try:
                text = self.read_text(relative)
            except (FileNotFoundError, ValueError, OSError):
                continue
            detailed.append({
                **base,
                **self.excerpt_sections(text, DETAIL_EXCERPT_CHARS),
            })
        return detailed

    def run_packet_command(self, prompt: str) -> str:
        command = self.config["packet_command"]
        if not command:
            return ""
        try:
            completed = subprocess.run(
                shlex.split(command, posix=os.name != "nt"),
                input=prompt,
                text=True,
                encoding="utf-8",
                errors="replace",
                capture_output=True,
                timeout=180,
                check=True,
                cwd=self.root,
            )
            return completed.stdout.strip()
        except (OSError, subprocess.SubprocessError):
            return ""

    def selection_prompt(
        self,
        problem: str,
        instruction: str,
        candidates: list[dict],
        preferred: list[str],
        *,
        stage: str = "final",
    ) -> str:
        candidate_lines = "\n".join(
            json.dumps(item, ensure_ascii=False, separators=(",", ":"))
            for item in candidates
        )
        preferred_text = "、".join(preferred[:12]) or "なし"
        is_coarse = stage == "coarse"
        limit = COARSE_SELECTION_LIMIT if is_coarse else 12
        stage_instruction = (
            "これは第1段階の粗選定です。本文抜粋を比較し、最終候補になり得る資料を最大20件まで選択してください。"
            if is_coarse
            else "これは最終選定です。本文抜粋を比較し、Research Packetに使用する資料を最大12件まで選択してください。"
        )
        return (
            "あなたは研究資料の選定担当です。\n\n"
            "目的は、今回の研究上の問題を検討するために必要な資料を、候補一覧から選ぶことです。\n\n"
            "単に更新日時が新しい資料や、問題文と同じ単語を含む資料を優先してはいけません。\n\n"
            "以下の観点で候補を評価してください。\n"
            "1. 今回の問題に直接関係する実験事実を含むか\n"
            "2. 現在の研究目的・研究方針を理解するために必要か\n"
            "3. 過去の解釈・仮説・議論を確認するために必要か\n"
            "4. 比較対象、反例、別条件の結果など、異なる解釈を検討するために必要か\n"
            "5. 最近の結果だけでは判断できない場合、過去の重要資料を補う必要があるか\n\n"
            "ファイル名やpathだけでは内容を断定してはいけません。\n"
            "候補一覧に含まれる本文抜粋を確認した上で判断してください。\n\n"
            "Research Packetが一方向の情報だけで構成されないよう、必要に応じて以下を含めてください。\n"
            "- 研究目的または全体方針\n"
            "- 関連する実験事実\n"
            "- 現在または過去の解釈\n"
            "- 比較・対照に使える資料\n"
            "- 今回の問題に直結する最近の記録\n\n"
            f"{stage_instruction}\n"
            "候補一覧に存在するpathのみ使用してください。\n"
            f"選択数の上限は{limit}件です。\n"
            "出力はJSON配列のみとしてください。\n"
            "説明文やMarkdownは付けないでください。\n"
            '出力例: ["knowledge/example.md"]\n\n'
            f"今回考えたい問題:\n{problem}\n\n"
            f"資料の取得指示:\n{instruction}\n\n"
            f"手動選択された候補:\n{preferred_text}\n\n"
            "候補一覧（path、ファイル名、サイズ、更新日時、冒頭の見出し、本文の冒頭・中央・末尾の抜粋）:\n"
            f"{candidate_lines}"
        )

    @staticmethod
    def parse_selected_files(
        output: str,
        candidates: list[dict],
        limit: int = 12,
    ) -> list[str]:
        allowed = {item["path"] for item in candidates}
        cleaned = re.sub(r"^\x60{3}(?:json)?\s*|\s*\x60{3}$", "", output.strip(), flags=re.IGNORECASE | re.DOTALL)
        parsed = None
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\[[\s\S]*\]", cleaned)
            if match:
                try:
                    parsed = json.loads(match.group(0))
                except json.JSONDecodeError:
                    parsed = None
        if isinstance(parsed, dict):
            parsed = parsed.get("files") or parsed.get("selected_files")
        if not isinstance(parsed, list):
            return []
        selected: list[str] = []
        for item in parsed:
            value = item.get("path") if isinstance(item, dict) else item
            value = str(value or "").replace("\\", "/").lstrip("/")
            if value in allowed and value not in selected:
                selected.append(value)
        return selected[:max(1, int(limit))]

    def choose_packet_files(
        self,
        requested: list[str],
        problem: str = "",
        selection_instruction: str = "",
    ) -> tuple[list[str], str]:
        if selection_instruction and self.config["packet_command"]:
            candidates = self.packet_candidates()
            if candidates:
                coarse_output = self.run_packet_command(
                    self.selection_prompt(
                        problem,
                        selection_instruction,
                        candidates,
                        requested,
                        stage="coarse",
                    )
                )
                coarse_selected = self.parse_selected_files(
                    coarse_output,
                    candidates,
                    limit=COARSE_SELECTION_LIMIT,
                )
                if coarse_selected:
                    detailed_candidates = self.detailed_packet_candidates(coarse_selected, candidates)
                    if detailed_candidates:
                        final_output = self.run_packet_command(
                            self.selection_prompt(
                                problem,
                                selection_instruction,
                                detailed_candidates,
                                requested,
                                stage="final",
                            )
                        )
                        selected = self.parse_selected_files(final_output, detailed_candidates)
                        if selected:
                            return selected, "luna"

        chosen: list[str] = []
        for relative in requested[:12]:
            try:
                path = self.resolve(relative)
                if path.is_file() and self.is_text(path) and path.stat().st_size <= MAX_PREVIEW_BYTES:
                    chosen.append(self.relative(path))
            except (FileNotFoundError, ValueError):
                continue
        if chosen:
            return list(dict.fromkeys(chosen)), "manual"

        state_path = self.config["state_file"]
        goal_path = self.config["goal_file"]
        for relative in [goal_path, state_path]:
            try:
                if self.resolve(relative).is_file():
                    chosen.append(relative)
            except FileNotFoundError:
                pass
        chosen.extend(record["path"] for record in self.recent_records(4))
        return list(dict.fromkeys(chosen))[:8], "automatic"

    def packet_prompt(self, problem: str, files: list[str]) -> str:
        extracts = []
        used = 0
        for relative in files:
            try:
                text = self.read_text(relative)[:5000]
            except (FileNotFoundError, ValueError, OSError):
                continue
            remaining = MAX_PACKET_CHARS - used
            if remaining <= 0:
                break
            text = text[:remaining]
            used += len(text)
            extracts.append(f"--- {relative} ---\n{text}")
        return (
            "以下のローカル研究記録を整理し、Research Packetを作成してください。\n"
            "新しい研究方向の判断や提案は行わず、事実と解釈を明確に分けてください。\n"
            "見出しは『研究目的』『現在分かっている事実』『現在の解釈』"
            "『最近の実験結果』『今回考えたい問題』『参照した研究ファイル』の順にしてください。\n\n"
            f"今回考えたい問題:\n{problem}\n\n" + "\n\n".join(extracts)
        )

    def fallback_packet(self, problem: str, files: list[str]) -> str:
        goal = "（研究目的ファイルが未設定です）"
        try:
            goal = self.read_text(self.config["goal_file"])[:3500]
        except (FileNotFoundError, ValueError, OSError):
            pass
        facts, interpretations, results = [], [], []
        for relative in files:
            try:
                excerpt = self.read_text(relative)[:3500].strip()
            except (FileNotFoundError, ValueError, OSError):
                continue
            block = f"### {relative}\n{excerpt}"
            lower = relative.lower()
            if lower.startswith("knowledge/"):
                interpretations.append(block)
            elif "experiment" in lower or lower.startswith("database/"):
                results.append(block)
            else:
                facts.append(block)
        return "\n\n".join([
            "# Research Packet",
            f"## 研究目的\n{goal}",
            "## 現在分かっている事実\n" + ("\n\n".join(facts) or "（選択資料から抽出できませんでした）"),
            "## 現在の解釈\n" + ("\n\n".join(interpretations) or "（選択資料から抽出できませんでした）"),
            "## 最近の実験結果\n" + ("\n\n".join(results) or "（選択資料から抽出できませんでした）"),
            f"## 今回考えたい問題\n{problem}",
            "## 参照した研究ファイル\n" + "\n".join(f"- {path}" for path in files),
        ])

    def create_packet(
        self,
        problem: str,
        requested: list[str],
        selection_instruction: str = "",
    ) -> dict:
        files, selection_method = self.choose_packet_files(
            requested,
            problem=problem,
            selection_instruction=selection_instruction,
        )
        prompt = self.packet_prompt(problem, files)
        markdown = self.run_packet_command(prompt)
        generated_by = "local-server extraction"
        if markdown:
            generated_by = "Work / Luna"
        if not markdown:
            markdown = self.fallback_packet(problem, files)
        return {
            "id": str(uuid.uuid4()),
            "markdown": markdown,
            "sources": files,
            "selection_method": selection_method,
            "selection_instruction": selection_instruction,
            "generated_by": generated_by,
            "created_at": utc_iso(),
        }

    def adopt(self, packet_id: str, problem: str, response: str, sources: list[str]) -> str:
        directory = self.resolve(self.config["adoption_directory"], must_exist=False)
        directory.mkdir(parents=True, exist_ok=True)
        now = datetime.now()
        filename = f"{now:%Y%m%d_%H%M%S}_sol-adopted.md"
        path = (directory / filename).resolve()
        path.relative_to(self.root)
        source_lines = "\n".join(f"- {item}" for item in sources[:100]) or "- なし"
        content = (
            "# 採用したSol回答\n\n"
            f"- 採用日時: {now.astimezone().isoformat(timespec='seconds')}\n"
            f"- Research Packet ID: {packet_id}\n"
            "- 扱い: 人間が採用した解釈（実験事実ではない）\n\n"
            f"## 今回考えた問題\n{problem}\n\n"
            f"## 採用内容\n{response}\n\n"
            f"## 参照した研究ファイル\n{source_lines}\n"
        )
        path.write_text(content, encoding="utf-8")
        return self.relative(path)


class ResearchHandler(BaseHTTPRequestHandler):
    server_version = "VectoryResearch/1.0"

    @property
    def repository(self) -> ResearchRepository:
        return self.server.repository  # type: ignore[attr-defined]

    @property
    def config(self) -> dict:
        return self.repository.config

    def log_message(self, format_string: str, *args) -> None:
        sys.stderr.write(f"[{self.log_date_time_string()}] {format_string % args}\n")

    def cors_origin(self) -> str | None:
        origin = self.headers.get("Origin", "")
        return origin if origin in self.config["allowed_origins"] else None

    def send_json(self, status: int, payload: dict) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        origin = self.cors_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(encoded)

    def send_file(self, path: Path) -> None:
        size = path.stat().st_size
        if size > int(self.config.get("max_download_bytes", MAX_DOWNLOAD_BYTES)):
            raise ValueError("ファイルが大きすぎるため、ブラウザーでは開けません。")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mimetypes.guess_type(path.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(size))
        self.send_header("Content-Disposition", f"inline; filename*=UTF-8''{quote(path.name)}")
        self.send_header("Cache-Control", "no-store")
        origin = self.cors_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        with path.open("rb") as handle:
            while chunk := handle.read(64 * 1024):
                self.wfile.write(chunk)

    def authorized(self) -> bool:
        supplied = self.headers.get("Authorization", "")
        expected = f"Bearer {self.config['token']}"
        return secrets.compare_digest(supplied, expected)

    def require_authorization(self) -> bool:
        if self.authorized():
            return True
        self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "アクセストークンが正しくありません。"})
        return False

    def read_json(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ValueError("Content-Lengthが不正です。") from error
        if length <= 0 or length > MAX_REQUEST_BYTES:
            raise ValueError("リクエストサイズが不正です。")
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError("JSONを読み取れません。") from error

    def do_OPTIONS(self) -> None:  # noqa: N802
        origin = self.cors_origin()
        if not origin:
            self.send_json(HTTPStatus.FORBIDDEN, {"error": "許可されていない接続元です。"})
            return
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Vary", "Origin")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if not self.require_authorization():
            return
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        try:
            if parsed.path == "/api/health":
                self.send_json(HTTPStatus.OK, {
                    "online": True,
                    "message": "自宅PCの研究フォルダーに接続しています。",
                    "root_name": self.repository.root.name,
                    "server_time": utc_iso(),
                })
            elif parsed.path == "/api/state":
                self.send_json(HTTPStatus.OK, self.repository.state())
            elif parsed.path == "/api/records":
                limit = int(query.get("limit", ["5"])[0])
                self.send_json(HTTPStatus.OK, {"records": self.repository.recent_records(limit)})
            elif parsed.path == "/api/files":
                relative = query.get("path", [""])[0]
                self.send_json(HTTPStatus.OK, {"path": relative.strip("/"), "entries": self.repository.list_directory(relative)})
            elif parsed.path == "/api/file":
                relative = query.get("path", [""])[0]
                path = self.repository.resolve(relative)
                self.send_json(HTTPStatus.OK, {
                    "path": self.repository.relative(path),
                    "mime_type": mimetypes.guess_type(path.name)[0] or "text/plain",
                    "content": self.repository.read_text(relative),
                })
            elif parsed.path == "/api/download":
                relative = query.get("path", [""])[0]
                path = self.repository.resolve(relative)
                if not path.is_file():
                    raise ValueError("ファイルではありません。")
                self.send_file(path)
            else:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "APIが見つかりません。"})
        except FileNotFoundError:
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "研究資料が見つかりません。"})
        except (ValueError, OSError) as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})

    def do_POST(self) -> None:  # noqa: N802
        if not self.require_authorization():
            return
        parsed = urlparse(self.path)
        try:
            payload = self.read_json()
            if parsed.path == "/api/packets":
                problem = str(payload.get("problem", "")).strip()
                instruction = str(payload.get("selection_instruction", "")).strip()
                selected = payload.get("selected_files") or []
                if (
                    not problem
                    or len(problem) > 4000
                    or len(instruction) > 4000
                    or not isinstance(selected, list)
                ):
                    raise ValueError("今回考えたい問題、資料の取得指示、または参照資料が不正です。")
                self.send_json(
                    HTTPStatus.CREATED,
                    self.repository.create_packet(
                        problem,
                        [str(item) for item in selected],
                        selection_instruction=instruction,
                    ),
                )
            elif parsed.path == "/api/adoptions":
                packet_id = str(payload.get("packet_id", "")).strip()
                problem = str(payload.get("problem", "")).strip()
                response = str(payload.get("response", "")).strip()
                sources = payload.get("sources") or []
                if not packet_id or not response or len(response) > 100_000 or not isinstance(sources, list):
                    raise ValueError("採用内容が不正です。")
                relative = self.repository.adopt(packet_id, problem, response, [str(item) for item in sources])
                self.send_json(HTTPStatus.CREATED, {"adopted": True, "path": relative})
            else:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "APIが見つかりません。"})
        except ValueError as error:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})
        except OSError as error:
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": f"研究記録を保存できません: {error}"})


def main() -> None:
    parser = argparse.ArgumentParser(description="Vectory local research server")
    parser.add_argument("--config", default=str(Path(__file__).with_name("config.json")))
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    args = parser.parse_args()
    config = load_config(Path(args.config).resolve())
    server = ThreadingHTTPServer((args.host, args.port), ResearchHandler)
    server.repository = ResearchRepository(config)  # type: ignore[attr-defined]
    print(f"Vectory research server: http://{args.host}:{args.port}")
    print(f"Research root: {config['research_root']}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
