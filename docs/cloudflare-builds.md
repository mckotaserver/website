# Cloudflare Workers Builds

Workers Builds uses `mise.toml` and `mise.lock` through the build script.
Commit both lockfiles (`mise.lock` and `pnpm-lock.yaml`) along with the script.

Configure the connected Worker (`website`) in Settings → Build:

| Setting | Value |
| --- | --- |
| Build command | `bash scripts/cloudflare-build.sh` |
| Deploy command | `$HOME/.local/bin/mise exec -- pnpm exec wrangler deploy` |
| Root directory | `/` |
| Build variable | `SKIP_DEPENDENCY_INSTALL=1` |

The script installs mise, trusts the checked-out project configuration, installs
tools with `mise install --locked`, then installs dependencies with
`pnpm install --frozen-lockfile` and builds the site. Both build and deploy run
through `mise exec`, so they use the locked tools. The installer currently obtains
the latest mise itself; `mise.lock` locks Node.js and pnpm, not mise.

The connected Worker name must match `name` in `wrangler.jsonc`. Workers Builds
also needs a valid deployment API token configured in the dashboard.

For non-production branch deployments, if enabled, use
`$HOME/.local/bin/mise exec -- pnpm exec wrangler versions upload`.
