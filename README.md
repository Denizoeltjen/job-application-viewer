# Job Applications

A small React + TypeScript app for managing job applications: it generates a
print-ready CV and cover letter from structured JSON data, and tracks each
application's status (drafting, sent, interview, etc.) from a single dashboard.

This is a personal tool, shared as a template — clone it, fill in your own
data, and use it to manage your own applications.

## Features

- Dashboard listing all applications with status tracking
- Print-optimized CV and cover letter documents (clean 2-page PDF export)
- Plain-text export for pasting into LLMs or application forms
- Form-based and raw-JSON editing for each application
- Per-user login; all edits are stored on the server, not in the browser
- Your personal data (profile, cover letters) is kept out of git entirely

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS · React Router

Backend: Hono on Node 24 · SQLite (`node:sqlite`) · session cookie login

## Getting started

```bash
git clone https://github.com/seanmaier/job-application-viewer.git
cd job-application-viewer
npm install
```

Your profile and application data live in `private/`, which is gitignored and
never committed. Set it up from the provided examples:

```bash
cp private/profiles/en.example.json private/profiles/en.json
cp private/profiles/de.example.json private/profiles/de.json
cp private/applications/example.json private/applications/<your-application-id>.json
```

Fill in your own details. Application files under `private/applications/` are
picked up automatically — no need to register them anywhere. The app also
runs fine with none of this in place (e.g. straight after cloning); it just
falls back to the example profile and shows an empty dashboard.

Then create a user and start the API and the dev server (Node 22.18+):

```bash
npm run users -- add <username>      # prints a generated password
npm run dev:server                   # API on :3000, SQLite in ./data/app.db
npm run dev                          # Vite on :5173, proxies /api
```

All edits (applications, statuses, notes, base profiles) are stored per user
on the server. To move data over from the old browser-only version, export a
backup there and restore it after logging in.

## Scripts

- `npm run dev` — start the local dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run Oxlint
- `npm run preview` — preview the production build locally
- `npm run dev:server` — run the API with auto-reload
- `npm run users -- <add|passwd|remove|list> [username] [password]` — manage users

## Deployment

Pushing to `main` builds an image and publishes it to
`ghcr.io/seanmaier/job-application-viewer` (`.github/workflows/docker.yml`).
Files under `private/` are never part of the image.

1. Create the data volume once on the host:
   `docker volume create job-applications-data` (or set `DATA_VOLUME` to use
   another name). It is external, so removing the stack or running
   `docker compose down -v` never deletes the database.
2. In Portainer, create a stack in Repository mode with compose path
   `deploy/docker-compose.yml`. If the GHCR package is private, add a
   registry for `ghcr.io` with a token that has `read:packages`.
3. Set the stack environment variable `PROXY_NETWORK` to the existing Docker
   network your reverse proxy or tunnel container is in. The app publishes no
   port; point the proxy at `http://job-applications:3000`. The proxy must
   serve the app over HTTPS, since the session cookie is `Secure`.
4. Open the container console and create a user:
   `node server/cli.ts add <username>`
5. Optional auto-redeploy: enable the stack's GitOps updates with the Webhook
   mechanism, turn on "Re-pull image" and "Force redeployment" (the image
   tag stays `latest`, so the Git commit alone shows no change), and store the
   webhook URL as the repository secret `PORTAINER_WEBHOOK_URL`. The image
   workflow calls it after each push. If GitHub can't reach Portainer, use
   the Polling mechanism instead and leave the secret unset.

Data lives in that volume (`/data/app.db` in the container). SQLite also keeps
recent writes in `app.db-wal`, so back up the whole volume with the container
stopped:

```bash
docker stop job-applications-app-1
docker run --rm -v job-applications-data:/data -v "$PWD":/backup alpine \n  tar czf /backup/job-applications-$(date +%F).tar.gz -C /data .
docker start job-applications-app-1
```

## License

MIT — see [LICENSE](LICENSE).
