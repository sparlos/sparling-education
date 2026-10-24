"""Short-path shim for espeak-ng.

espeak-ng fails (silently wrong phonemes or an init error) when its library or
data path is long, and the repo venv's site-packages path easily is. So at
startup we build a short per-user directory under the system temp dir that
holds a copy of the dylib and a symlink to the data, and point
`espeakng_loader` at it. This must run before `misaki` is imported, because
misaki reads the paths at import time.
"""

import os
import shutil
import tempfile
from pathlib import Path

import espeakng_loader


def install_short_paths() -> Path:
    real_lib = Path(espeakng_loader.get_library_path()).resolve()
    real_data = Path(espeakng_loader.get_data_path()).resolve()

    # macOS's TMPDIR (/var/folders/.../T) is itself long, so prefer /tmp.
    # Per-user so accounts don't clash; mode 0700 keeps others from swapping files.
    base = Path("/tmp") if os.path.isdir("/tmp") else Path(tempfile.gettempdir())
    short = base / f"kv-espeak-{os.getuid()}"
    short.mkdir(mode=0o700, exist_ok=True)

    lib = short / "libespeak-ng.dylib"
    if (
        not lib.exists()
        or lib.stat().st_size != real_lib.stat().st_size
        or lib.stat().st_mtime < real_lib.stat().st_mtime
    ):
        tmp = short / f".lib-{os.getpid()}"
        shutil.copy2(real_lib, tmp)
        os.replace(tmp, lib)

    data = short / "espeak-ng-data"
    if not (data.is_symlink() and Path(os.readlink(data)) == real_data):
        tmp = short / f".data-{os.getpid()}"
        os.symlink(real_data, tmp)
        os.replace(tmp, data)

    espeakng_loader.get_library_path = lambda: str(lib)
    espeakng_loader.get_data_path = lambda: str(data)
    return short
