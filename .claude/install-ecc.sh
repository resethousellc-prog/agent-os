#!/usr/bin/env sh
# Idempotent ECC (Every Claude Code) installer for Claude Code web/remote sessions.
# Runs from the SessionStart hook so ECC's agents/skills/commands/hooks survive
# the ephemeral remote container (everything under ~/.claude is wiped per session).
# Fail-soft: never blocks session start, even with no network.
#
# git protocol is scoped to the session's allowed repo, so ECC is fetched as a
# pinned release tarball over plain HTTPS instead of `git clone`.

set -e

ECC_VERSION="${ECC_VERSION:-v2.0.0}"
ECC_PROFILE="${ECC_PROFILE:-developer}"
ECC_SRC="${ECC_SRC:-$HOME/.ecc}"
STATE="$HOME/.claude/ecc/install-state.json"

# Already installed this session? Nothing to do.
if [ -f "$STATE" ]; then
    exit 0
fi

# Fetch + extract the pinned release tarball.
TARBALL="$(mktemp)"
URL="https://codeload.github.com/affaan-m/ECC/tar.gz/refs/tags/${ECC_VERSION}"
if ! curl -fsSL "$URL" -o "$TARBALL"; then
    echo "[install-ecc] download failed for ${ECC_VERSION} (continuing without ECC)" >&2
    rm -f "$TARBALL"; exit 0
fi
rm -rf "$ECC_SRC" && mkdir -p "$ECC_SRC"
if ! tar -xzf "$TARBALL" -C "$ECC_SRC" --strip-components=1; then
    echo "[install-ecc] extract failed (continuing without ECC)" >&2
    rm -f "$TARBALL"; exit 0
fi
rm -f "$TARBALL"

# Install node deps for the installer runtime, then apply the profile to ~/.claude.
(
    cd "$ECC_SRC"
    if [ ! -d node_modules ]; then
        npm install --no-audit --no-fund --loglevel=error >/dev/null 2>&1 || {
            echo "[install-ecc] npm install failed (continuing without ECC)" >&2; exit 0; }
    fi
    node scripts/install-apply.js --target claude --profile "$ECC_PROFILE" >/dev/null 2>&1 || {
        echo "[install-ecc] install-apply failed (continuing without ECC)" >&2; exit 0; }
) || true

exit 0
