# Cloudflare Workers Builds

Workers Builds uses `mise.toml` and `mise.lock` through the build script.
Commit both lockfiles (`mise.lock` and `pnpm-lock.yaml`) along with the script.

Configure the connected Worker (`website`) in Settings → Build:

| Setting | Value |
| --- | --- |
| Build command | `bash scripts/cloudflare-build.sh` |
| Deploy command | `MISE_CONFIG_DIR="$PWD/scripts" MISE_SYSTEM_CONFIG_FILE="$PWD/scripts/mise-empty.toml" MISE_IGNORED_CONFIG_PATHS="$HOME/.tool-versions" $HOME/.local/bin/mise exec -- pnpm exec wrangler deploy` |
| Root directory | `/` |
| Build variable | `SKIP_DEPENDENCY_INSTALL=1` |

Set the build variable in both the Production and Previews Base tabs. Preview
builds do not inherit the production build variables. Without it, the build
image runs its own dependency installation before the build script can select
the locked pnpm version.

After changing build settings, push a new commit to start a fresh build. Retrying
an older build can reuse its previous configuration, including build variables.

The script installs mise, trusts the checked-out project configuration, installs
tools with `mise install --locked`, then installs dependencies with
`pnpm install --frozen-lockfile` and builds the site. Both build and deploy run
through `mise exec`, so they use the locked tools. The installer currently obtains
the latest mise itself; `mise.lock` locks Node.js and pnpm, not mise.

Both commands disable global and system mise configuration so tools provided by
the build image do not become additional lockfile requirements. The build image's
`~/.tool-versions` is explicitly ignored as well; changing `MISE_CONFIG_DIR` alone
does not prevent mise from reading that file.

The connected Worker name must match `name` in `wrangler.jsonc`. Workers Builds
also needs a valid deployment API token configured in the dashboard.

For non-production branch deployments, if enabled, use
`MISE_CONFIG_DIR="$PWD/scripts" MISE_SYSTEM_CONFIG_FILE="$PWD/scripts/mise-empty.toml" MISE_IGNORED_CONFIG_PATHS="$HOME/.tool-versions" $HOME/.local/bin/mise exec -- pnpm exec wrangler versions upload`.
