# VOLTLINE API (Cloudflare Worker)

Backend for the `index.html` frontend. Moves everything that can't be trusted
in a browser off the client: account passwords, admin auth, the-odds-api key,
and bet placement/settlement.

## What it replaces

| Was (client-only)                                  | Now                                                    |
|------------------------------------------------------|---------------------------------------------------------|
| Passwords stored in `localStorage`, compared in JS   | PBKDF2-hashed, verified server-side                     |
| Admin panel gated by a hardcoded string in the JS bundle | `POST /api/admin/login` checks a Worker secret         |
| the-odds-api key shipped in the page source          | Key lives in a Worker secret, client calls `/api/odds/:sport` |
| Bet placement/balance/wins-losses mutated client-side | All of it happens in the Worker against KV             |
| Spread/total bets graded like moneyline (bug)         | `resolveLeg` grades each market correctly, incl. pushes |

## One-time setup

```bash
cd worker
npm install
npx wrangler login

# Create the KV namespace, then paste the returned id into wrangler.toml
npx wrangler kv namespace create VOLTLINE_KV

# Secrets (prompted interactively — never commit these)
npx wrangler secret put ODDS_API_KEY     # your the-odds-api.com key
npx wrangler secret put ADMIN_PASSWORD   # whatever you want the admin password to be
```

## Deploy

```bash
npx wrangler deploy
```

This prints your Worker's URL, e.g. `https://voltline-api.<your-subdomain>.workers.dev`.

## Wire up the frontend

Open `index.html` and set:

```js
const API_BASE = 'https://voltline-api.<your-subdomain>.workers.dev';
```

Then push `index.html` to whatever branch GitHub Pages serves. No other
frontend changes are needed — `index.html` already calls all the `/api/*`
routes below.

## Local development

```bash
cd worker
npm run dev   # wrangler dev, defaults to http://localhost:8787
```

Point `API_BASE` at `http://localhost:8787` while iterating locally, and back
at the deployed Worker URL before pushing.

## Routes

- `POST /api/signup` `{ name, email, password }`
- `POST /api/login` `{ identifier, password }`
- `GET  /api/me` (Bearer token)
- `POST /api/me/redeem` (Bearer token) — zeroes balance/playthrough
- `POST /api/me/deposit` `{ packId }` (Bearer token) — credits a canonical pack, ignores any client-sent amount
- `GET  /api/bets` (Bearer token) — resolves this account's pending bets, then returns full history
- `POST /api/bets` `{ legs, stake }` (Bearer token)
- `GET  /api/accounts/find?q=` (Bearer token) — friend search by username/email
- `GET  /api/accounts/batch?ids=a,b,c` (Bearer token) — hydrate a friends list
- `GET  /api/odds/:sport` — proxied, cached the-odds-api data (no key exposed)
- `POST /api/admin/login` `{ password }`
- `GET  /api/admin/accounts` (Bearer admin token)
- `GET  /api/admin/bets` (Bearer admin token) — resolves pending bets across all accounts first

## Notes

- Storage is one KV namespace, key-prefixed (`account:`, `account_email:`,
  `account_username:`, `session:`, `admin_session:`, `bet:<accountId>:<betId>`,
  `oddscache:<sport>`). No migrations needed to add more record types later.
- Sessions are bearer tokens with a 7-day KV TTL; admin tokens expire after 2
  hours. There's no logout endpoint yet — none existed in the original client
  either — add one (delete the `session:<token>` key) if you need it.
- `MOCK_USERS` in `src/index.js` are the same cosmetic placeholder accounts the
  original client hardcoded, so the admin panel isn't empty on a fresh deploy.
  Delete the constant (and its two usages) once there's real traffic.
