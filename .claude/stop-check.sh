#!/usr/bin/env sh
# Stop hook — session-end verification for agent-os.
# Advisory only (always exits 0): surfaces likely secrets and leftover debug
# statements in the working tree so they get caught before being committed.
# Scans only added/modified lines vs HEAD, so it never flags pre-existing code.

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
command -v git >/dev/null 2>&1 || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

# Added lines across staged + unstaged changes ("+" lines, excluding "+++" headers).
added=$( { git diff HEAD 2>/dev/null; git diff --cached 2>/dev/null; } \
    | grep -E '^\+' | grep -vE '^\+\+\+' 2>/dev/null || true )
[ -z "$added" ] && exit 0

# Likely secrets: AWS keys, private-key headers, OpenAI/GitHub/Slack tokens,
# and obvious "<secret-ish-name> = <long literal>" assignments.
secrets=$( printf '%s\n' "$added" | grep -nE \
    'AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[A-Za-z0-9]{20,}|gh[posru]_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{10,}|(api[_-]?key|secret|password|passwd|token|access[_-]?key)["'"'"' ]*[:=][ ]*["'"'"'][A-Za-z0-9/_+.\-]{16,}' \
    2>/dev/null || true )

# Leftover debug statements (JS/TS-centric, matching this repo's stack).
debug=$( printf '%s\n' "$added" | grep -nE \
    'console\.(log|debug|trace|dir)\(|^\+[[:space:]]*debugger;?' \
    2>/dev/null || true )

found=0
if [ -n "$secrets" ]; then
    found=1
    echo "[stop-check] /!\\ Possible secrets in uncommitted changes:" >&2
    printf '%s\n' "$secrets" | head -20 >&2
    echo "  -> Per CLAUDE.md, store env var NAMES only — never raw keys." >&2
fi
if [ -n "$debug" ]; then
    found=1
    echo "[stop-check] /!\\ Leftover debug statements in uncommitted changes:" >&2
    printf '%s\n' "$debug" | head -20 >&2
fi
[ "$found" -eq 1 ] && echo "[stop-check] Advisory only — review the above before committing." >&2

exit 0
