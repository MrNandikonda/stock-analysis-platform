from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def run() -> None:
    root = Path(__file__).resolve().parent
    db_path = os.getenv("DB_PATH", str((root.parent / "data" / "stocks.db").resolve()))
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    migration_files = sorted(root.glob("*.sql"))
    with sqlite3.connect(db_path) as connection:
        cursor = connection.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TEXT NOT NULL
            );
            """
        )
        applied = {row[0] for row in cursor.execute("SELECT version FROM schema_migrations").fetchall()}

        for migration_file in migration_files:
            version = migration_file.stem
            if version in applied:
                continue
            sql = migration_file.read_text(encoding="utf-8")
            cursor.executescript(sql)
            cursor.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                (version, datetime.now(tz=timezone.utc).isoformat()),
            )
            connection.commit()
            print(f"Applied migration {version}")


if __name__ == "__main__":
    run()

