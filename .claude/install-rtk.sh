#!/usr/bin/env sh
# Idempotent rtk installer for Claude Code (web/remote) sessions.
# Runs from the SessionStart hook so rtk survives the ephemeral container.
# Fail-soft: never blocks session start, even with no network.
#
# rtk (Rust Token Killer) transparently rewrites dev commands (git, etc.)
# to token-optimized equivalents via the PreToolUse hook in settings.json.

set -e

INSTALL_DIR="${RTK_INSTALL_DIR:-$HOME/.local/bin}"
RTK_BIN="${INSTALL_DIR}/rtk"

# Already installed? Nothing to do.
if [ -x "$RTK_BIN" ] || command -v rtk >/dev/null 2>&1; then
    exit 0
fi

# Install the single static binary (checksum-verified by the upstream script).
if ! curl -fsSL https://raw.githubusercontent.com/rtk-ai/rtk/refs/heads/master/install.sh | sh; then
    echo "[install-rtk] rtk install failed (continuing without it)" >&2
    exit 0
fi

exit 0
