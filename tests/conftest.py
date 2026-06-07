"""Pytest fixtures shared across the test suite."""
from pathlib import Path
import sys

# Note: scripts/ is added to sys.path, but tests import via importlib.util.spec_from_file_location (absolute path).
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
VAULT_PATH_ENV = "KAIHOU_VAULT_PATH"
DEFAULT_VAULT_PATH = Path("/home/ezioaalves/Documents/Kaihou (Naruto D20)")
