#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

installer="$(mktemp)"
trap 'rm -f "$installer"' EXIT
curl --fail --silent --show-error --location https://mise.run --output "$installer"
sh "$installer"

mise_bin="$HOME/.local/bin/mise"
"$mise_bin" trust
"$mise_bin" install --locked
"$mise_bin" exec -- node --version
"$mise_bin" exec -- pnpm --version
"$mise_bin" exec -- pnpm install --frozen-lockfile
"$mise_bin" exec -- pnpm run build
