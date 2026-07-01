// VOLTLINE API — Cloudflare Worker
//
// Moves everything that can't be trusted on a static client off the browser:
// account passwords, admin auth, the-odds-api key, and bet placement/settlement.
// Storage: a single KV namespace (binding VOLTLINE_KV), key-prefixed by record type.

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const ADMIN_SESSION_TTL = 60 * 60 * 2; // 2 hours
const ODDS_CACHE_TTL = 300; // 5 minutes, matches the-odds-api free-tier budget

const ESPN_URLS = {
  NBA: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  NFL: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  MLB: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  Soccer: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
  NHL: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  UFC: 'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard',
  'World Cup': 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
};

const ODDS_SPORT_KEYS = {
  NBA: 'basketball_nba', NFL: 'americanfootball_nfl', MLB: 'baseball_mlb', NHL: 'icehockey_nhl',
};

const TEAM_ABBR = {
  'Atlanta Hawks':'ATL','Boston Celtics':'BOS','Brooklyn Nets':'BKN','Charlotte Hornets':'CHA',
  'Chicago Bulls':'CHI','Cleveland Cavaliers':'CLE','Dallas Mavericks':'DAL','Denver Nuggets':'DEN',
  'Detroit Pistons':'DET','Golden State Warriors':'GSW','Houston Rockets':'HOU','Indiana Pacers':'IND',
  'Los Angeles Clippers':'LAC','Los Angeles Lakers':'LAL','Memphis Grizzlies':'MEM','Miami Heat':'MIA',
  'Milwaukee Bucks':'MIL','Minnesota Timberwolves':'MIN','New Orleans Pelicans':'NOP','New York Knicks':'NYK',
  'Oklahoma City Thunder':'OKC','Orlando Magic':'ORL','Philadelphia 76ers':'PHI','Phoenix Suns':'PHX',
  'Portland Trail Blazers':'POR','Sacramento Kings':'SAC','San Antonio Spurs':'SAS','Toronto Raptors':'TOR',
  'Utah Jazz':'UTA','Washington Wizards':'WAS',
  'Arizona Cardinals':'ARI','Atlanta Falcons':'ATL','Baltimore Ravens':'BAL','Buffalo Bills':'BUF',
  'Carolina Panthers':'CAR','Chicago Bears':'CHI','Cincinnati Bengals':'CIN','Cleveland Browns':'CLE',
  'Dallas Cowboys':'DAL','Denver Broncos':'DEN','Detroit Lions':'DET','Green Bay Packers':'GB',
  'Houston Texans':'HOU','Indianapolis Colts':'IND','Jacksonville Jaguars':'JAX','Kansas City Chiefs':'KC',
  'Las Vegas Raiders':'LV','Los Angeles Chargers':'LAC','Los Angeles Rams':'LAR','Miami Dolphins':'MIA',
  'Minnesota Vikings':'MIN','New England Patriots':'NE','New Orleans Saints':'NO','New York Giants':'NYG',
  'New York Jets':'NYJ','Philadelphia Eagles':'PHI','Pittsburgh Steelers':'PIT','San Francisco 49ers':'SF',
  'Seattle Seahawks':'SEA','Tampa Bay Buccaneers':'TB','Tennessee Titans':'TEN','Washington Commanders':'WSH',
  'Arizona Diamondbacks':'ARI','Atlanta Braves':'ATL','Baltimore Orioles':'BAL','Boston Red Sox':'BOS',
  'Chicago Cubs':'CHC','Chicago White Sox':'CWS','Cincinnati Reds':'CIN','Cleveland Guardians':'CLE',
  'Colorado Rockies':'COL','Detroit Tigers':'DET','Houston Astros':'HOU','Kansas City Royals':'KC',
  'Los Angeles Angels':'LAA','Los Angeles Dodgers':'LAD','Miami Marlins':'MIA','Milwaukee Brewers':'MIL',
  'Minnesota Twins':'MIN','New York Mets':'NYM','New York Yankees':'NYY','Oakland Athletics':'OAK',
  'Philadelphia Phillies':'PHI','Pittsburgh Pirates':'PIT','San Diego Padres':'SD','San Francisco Giants':'SF',
  'Seattle Mariners':'SEA','St. Louis Cardinals':'STL','Tampa Bay Rays':'TB','Texas Rangers':'TEX',
  'Toronto Blue Jays':'TOR','Washington Nationals':'WSH',
  'Anaheim Ducks':'ANA','Boston Bruins':'BOS','Buffalo Sabres':'BUF','Calgary Flames':'CGY',
  'Carolina Hurricanes':'CAR','Chicago Blackhawks':'CHI','Colorado Avalanche':'COL','Columbus Blue Jackets':'CBJ',
  'Dallas Stars':'DAL','Detroit Red Wings':'DET','Edmonton Oilers':'EDM','Florida Panthers':'FLA',
  'Los Angeles Kings':'LAK','Minnesota Wild':'MIN','Montreal Canadiens':'MTL','Nashville Predators':'NSH',
  'New Jersey Devils':'NJD','New York Islanders':'NYI','New York Rangers':'NYR','Ottawa Senators':'OTT',
  'Philadelphia Flyers':'PHI','Pittsburgh Penguins':'PIT','San Jose Sharks':'SJS','Seattle Kraken':'SEA',
  'St. Louis Blues':'STL','Tampa Bay Lightning':'TBL','Toronto Maple Leafs':'TOR','Utah Hockey Club':'UTA',
  'Vancouver Canucks':'VAN','Vegas Golden Knights':'VGK','Washington Capitals':'WSH','Winnipeg Jets':'WPG',
};

// Canonical pack pricing — the client only ever sends a packId, never an amount,
// so a tampered request can't credit more than a real pack is worth.
const PACKS = [
  { id:'p1', price:1,   gems:100,   promo:1.00,   name:'$1 Pack' },
  { id:'p2', price:5,   gems:500,   promo:5.50,   name:'$5 Pack' },
  { id:'p3', price:10,  gems:1000,  promo:11.00,  name:'$10 Pack' },
  { id:'p4', price:25,  gems:2500,  promo:27.50,  name:'$25 Pack' },
  { id:'p5', price:50,  gems:5000,  promo:55.00,  name:'$50 Pack' },
  { id:'p6', price:100, gems:10000, promo:110.00, name:'$100 Pack' },
  { id:'p7', price:250, gems:25000, promo:275.00, name:'$250 Pack' },
];

// Cosmetic placeholder users so the admin panel isn't empty on a fresh deploy.
const MOCK_USERS = [
  { id:'u1', name:'Jordan Diaz',  initials:'JD', email:'jordan@voltline.bet', balance:3240.50, bets:231, wins:142, losses:89, joined:'Jan 2026', bg:'linear-gradient(135deg,#00c0c8,#0050ff)' },
  { id:'u2', name:'Marcus Tan',   initials:'MT', email:'marcus@voltline.bet', balance:1890.00, bets:145, wins:98,  losses:47, joined:'Feb 2026', bg:'linear-gradient(135deg,#ff6a3d,#ff2952)' },
  { id:'u3', name:'Sara Klein',   initials:'SK', email:'sara@voltline.bet',   balance:5120.75, bets:389, wins:241, losses:148,joined:'Nov 2025', bg:'linear-gradient(135deg,#00c0c8,#0050ff)' },
  { id:'u4', name:'Devin Royce',  initials:'DR', email:'devin@voltline.bet',  balance:780.25,  bets:67,  wins:42,  losses:25, joined:'Mar 2026', bg:'linear-gradient(135deg,#7b5cff,#0050ff)' },
  { id:'u5', name:'Priya Nair',   initials:'PN', email:'priya@voltline.bet',  balance:2650.00, bets:198, wins:121, losses:77, joined:'Dec 2025', bg:'linear-gradient(135deg,#00e676,#00c0c8)' },
];

// ─── HTTP helpers ────────────────────────────────────────────────────────────

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    Vary: 'Origin',
  };
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(request) },
  });
}

function errJson(request, message, status = 400) {
  return json(request, { error: message }, status);
}

async function readJsonBody(request) {
  try { return await request.json(); } catch { return {}; }
}

// ─── Crypto helpers ──────────────────────────────────────────────────────────

async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyPassword(password, salt, expectedHash) {
  return timingSafeEqual(await hashPassword(password, salt), expectedHash);
}

// ─── Bet math (canonical — server is the single source of truth) ───────────

function americanToDecimal(odds) {
  const o = parseInt(odds, 10);
  return o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o);
}

function calcCombinedOdds(legs) {
  if (legs.length === 0) return '';
  if (legs.length === 1) return legs[0].odds;
  const dec = legs.reduce((acc, l) => acc * americanToDecimal(l.odds), 1);
  const profit = (dec - 1) * 100;
  return dec >= 2 ? `+${Math.round(profit)}` : `-${Math.round(10000 / profit)}`;
}

function calcPayout(stake, legs) {
  if (!stake || legs.length === 0) return 0;
  if (legs.length === 1) {
    const o = parseInt(legs[0].odds, 10);
    const profit = o > 0 ? stake * (o / 100) : stake * (100 / Math.abs(o));
    return stake + profit;
  }
  const mult = legs.reduce((acc, l) => acc * americanToDecimal(l.odds), 1);
  return stake * mult;
}

// Resolves a single leg against a Final ESPN event.
// Fixes the bug where spread/total legs were graded as if they were moneyline
// (comparing leg.teamAbbr, which for O/U legs is literally "over"/"under", against
// the raw scoreboard winner).
function resolveLeg(leg, ev) {
  const comps = ev.competitions?.[0]?.competitors || [];
  if (comps.length < 2) return null;
  const [c0, c1] = comps;
  const score0 = parseInt(c0.score || '0', 10);
  const score1 = parseInt(c1.score || '0', 10);

  if (leg.market === 'ou') {
    const total = score0 + score1;
    const line = parseFloat(leg.line);
    if (Number.isNaN(line)) return null;
    if (total === line) return 'push';
    const overWon = total > line;
    return (leg.teamAbbr === 'over') === overWon ? 'won' : 'lost';
  }

  if (leg.market === 'spr') {
    const team = comps.find(c => c.team?.abbreviation === leg.teamAbbr);
    const opp = comps.find(c => c.team?.abbreviation !== leg.teamAbbr);
    if (!team || !opp) return null;
    const teamScore = parseInt(team.score || '0', 10);
    const oppScore = parseInt(opp.score || '0', 10);
    const line = parseFloat(leg.line);
    if (Number.isNaN(line)) return null;
    const adjusted = teamScore + line;
    if (adjusted === oppScore) return 'push';
    return adjusted > oppScore ? 'won' : 'lost';
  }

  // Moneyline
  if (score0 === score1) return 'push';
  const winnerAbbr = (score0 > score1 ? c0 : c1).team?.abbreviation;
  return winnerAbbr === leg.teamAbbr ? 'won' : 'lost';
}

async function fetchEspnEvents(sport) {
  const url = ESPN_URLS[sport];
  if (!url) return [];
  try {
    const data = await fetch(url).then(r => r.json());
    return data.events || [];
  } catch {
    return [];
  }
}

// ─── Odds proxy (hides the-odds-api key from the client) ───────────────────

function fmtOdds(p) { return p > 0 ? '+' + p : '' + p; }

function buildOddsMap(events) {
  const map = {};
  for (const ev of events) {
    const awayAbbr = TEAM_ABBR[ev.away_team], homeAbbr = TEAM_ABBR[ev.home_team];
    if (!awayAbbr || !homeAbbr) continue;
    const bk = ev.bookmakers?.[0];
    if (!bk) continue;
    const h2h = bk.markets?.find(m => m.key === 'h2h');
    const spr = bk.markets?.find(m => m.key === 'spreads');
    const tot = bk.markets?.find(m => m.key === 'totals');
    const entry = {};
    if (h2h) {
      const a = h2h.outcomes.find(o => TEAM_ABBR[o.name] === awayAbbr);
      const h = h2h.outcomes.find(o => TEAM_ABBR[o.name] === homeAbbr);
      if (a && h) { entry.awayOdds = fmtOdds(a.price); entry.homeOdds = fmtOdds(h.price); }
    }
    if (spr) {
      const a = spr.outcomes.find(o => TEAM_ABBR[o.name] === awayAbbr);
      const h = spr.outcomes.find(o => TEAM_ABBR[o.name] === homeAbbr);
      if (a && h) {
        entry.awaySpreadLine = a.point > 0 ? '+' + a.point : '' + a.point;
        entry.awaySpreadOdds = fmtOdds(a.price);
        entry.homeSpreadLine = h.point > 0 ? '+' + h.point : '' + h.point;
        entry.homeSpreadOdds = fmtOdds(h.price);
      }
    }
    if (tot) {
      const o = tot.outcomes.find(o => o.name === 'Over');
      const u = tot.outcomes.find(o => o.name === 'Under');
      if (o && u) { entry.totalLine = o.point; entry.overOdds = fmtOdds(o.price); entry.underOdds = fmtOdds(u.price); }
    }
    map[awayAbbr + '-' + homeAbbr] = entry;
  }
  return map;
}

async function getOddsMap(env, sport, debug = false) {
  const cacheKey = `oddscache:${sport}`;
  const cached = await env.VOLTLINE_KV.get(cacheKey, 'json');
  if (cached) return debug ? { map: cached, debug: { source: 'cache' } } : cached;
  const sportKey = ODDS_SPORT_KEYS[sport] || ODDS_SPORT_KEYS[sport.toUpperCase()];
  if (!sportKey) return debug ? { map: {}, debug: { reason: 'unknown_sport', sport } } : {};
  if (!env.ODDS_API_KEY) return debug ? { map: {}, debug: { reason: 'missing_ODDS_API_KEY_secret' } } : {};
  try {
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds?apiKey=${env.ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
    const resp = await fetch(url);
    const status = resp.status;
    const data = await resp.json().catch(() => null);
    if (!Array.isArray(data)) {
      return debug ? { map: {}, debug: { reason: 'non_array_response', status, body: data } } : {};
    }
    const map = buildOddsMap(data);
    await env.VOLTLINE_KV.put(cacheKey, JSON.stringify(map), { expirationTtl: ODDS_CACHE_TTL });
    return debug ? { map, debug: { source: 'live', status, count: data.length } } : map;
  } catch (e) {
    return debug ? { map: {}, debug: { reason: 'fetch_threw', message: String(e) } } : {};
  }
}

// ─── Account storage ─────────────────────────────────────────────────────────

function publicAccount(account) {
  const { id, name, initials, username, wins, losses } = account;
  return { id, name, initials, username, wins: wins || 0, losses: losses || 0 };
}

function accountForClient(account) {
  const { passwordHash, passwordSalt, ...rest } = account;
  return rest;
}

async function getAccount(env, id) {
  return env.VOLTLINE_KV.get(`account:${id}`, 'json');
}

async function saveAccount(env, account) {
  await env.VOLTLINE_KV.put(`account:${account.id}`, JSON.stringify(account));
}

async function findAccountIdByIdentifier(env, identifier) {
  const lower = identifier.trim().toLowerCase();
  return (await env.VOLTLINE_KV.get(`account_email:${lower}`)) ||
         (await env.VOLTLINE_KV.get(`account_username:${lower}`));
}

function todayStr(date = new Date()) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

// Server-side equivalent of the client's checkDailyReward — computed here so it
// can't be replayed by editing localStorage.
function applyDailyReward(account) {
  const today = todayStr();
  if (account.lastLoginDate === today) return null;

  const yesterday = todayStr(new Date(Date.now() - 86400000));
  const streak = account.lastLoginDate === yesterday ? (account.loginStreak || 0) + 1 : 1;
  const gemsEarned = 1000;
  const cashEarned = streak % 7 === 0 ? 1.00 : 0;

  account.gems = (account.gems || 0) + gemsEarned;
  account.balance = (account.balance || 0) + cashEarned;
  if (cashEarned > 0) {
    const batch = { id: 'pt_' + Date.now(), label: 'Login Bonus', total: cashEarned, remaining: cashEarned };
    account.playthroughBatches = [...(account.playthroughBatches || []), batch];
    account.totalPlaythroughRequired = (account.totalPlaythroughRequired || 0) + cashEarned;
  }
  account.loginStreak = streak;
  account.lastLoginDate = today;

  return { streak, gemsEarned, cashEarned };
}

async function createSession(env, accountId) {
  const token = crypto.randomUUID();
  await env.VOLTLINE_KV.put(`session:${token}`, accountId, { expirationTtl: SESSION_TTL });
  return token;
}

async function getAccountFromRequest(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const accountId = await env.VOLTLINE_KV.get(`session:${token}`);
  if (!accountId) return null;
  return getAccount(env, accountId);
}

async function requireAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return false;
  return Boolean(await env.VOLTLINE_KV.get(`admin_session:${token}`));
}

// ─── Bets storage + resolution ───────────────────────────────────────────────

async function listAccountBets(env, accountId) {
  const list = await env.VOLTLINE_KV.list({ prefix: `bet:${accountId}:` });
  const bets = await Promise.all(list.keys.map(k => env.VOLTLINE_KV.get(k.name, 'json')));
  return bets.filter(Boolean);
}

// Resolves any pending bets for one account against live ESPN results, crediting
// wins/pushes back to balance and incrementing win/loss counts. Mutates + persists
// the account if anything changed.
async function resolvePendingBets(env, account) {
  const bets = await listAccountBets(env, account.id);
  const pending = bets.filter(b => b.status === 'pending');
  if (pending.length === 0) return bets;

  const sportsNeeded = [...new Set(pending.flatMap(b => b.legs.map(l => l.sport)))];
  const eventsBySport = {};
  await Promise.all(sportsNeeded.map(async sport => { eventsBySport[sport] = await fetchEspnEvents(sport); }));

  let accountChanged = false;
  for (const bet of pending) {
    const legResults = bet.legs.map(leg => {
      const events = eventsBySport[leg.sport] || [];
      const ev = events.find(e => e.id === leg.gameId);
      if (!ev || ev.status?.type?.description !== 'Final') return null;
      return resolveLeg(leg, ev);
    });
    if (legResults.some(r => r === null)) continue;

    const newStatus = legResults.some(r => r === 'lost') ? 'lost'
      : legResults.every(r => r === 'push') ? 'push'
      : 'won';

    bet.status = newStatus;
    bet.settledAt = Date.now();
    await env.VOLTLINE_KV.put(`bet:${account.id}:${bet.id}`, JSON.stringify(bet));

    if (newStatus === 'won') { account.balance = (account.balance || 0) + bet.toWin; account.wins = (account.wins || 0) + 1; accountChanged = true; }
    else if (newStatus === 'lost') { account.losses = (account.losses || 0) + 1; accountChanged = true; }
    else if (newStatus === 'push') { account.balance = (account.balance || 0) + bet.stake; accountChanged = true; }
  }
  if (accountChanged) await saveAccount(env, account);
  return listAccountBets(env, account.id);
}

// ─── Route handlers ──────────────────────────────────────────────────────────

async function handleSignup(request, env) {
  const { name, email, password } = await readJsonBody(request);
  if (!name || !email || !password) return errJson(request, 'Please fill in all fields.', 400);
  if (password.length < 6) return errJson(request, 'Password must be at least 6 characters.', 400);

  const emailLower = email.trim().toLowerCase();
  if (await env.VOLTLINE_KV.get(`account_email:${emailLower}`)) {
    return errJson(request, 'Email already registered.', 409);
  }

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  let username = emailLower.split('@')[0];
  if (await env.VOLTLINE_KV.get(`account_username:${username}`)) {
    username = username + Math.floor(Math.random() * 10000);
  }
  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);

  const account = {
    id: 'u' + crypto.randomUUID(), name, initials, email: email.trim(), username,
    passwordHash, passwordSalt: salt,
    balance: 1000, gems: 0, bets: 0, wins: 0, losses: 0,
    loginStreak: 0, lastLoginDate: null,
    playthroughBatches: [], totalPlaythroughRequired: 0,
    joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  };

  const reward = applyDailyReward(account);
  await saveAccount(env, account);
  await env.VOLTLINE_KV.put(`account_email:${emailLower}`, account.id);
  await env.VOLTLINE_KV.put(`account_username:${username}`, account.id);

  const token = await createSession(env, account.id);
  return json(request, { token, account: accountForClient(account), reward });
}

async function handleLogin(request, env) {
  const { identifier, password } = await readJsonBody(request);
  if (!identifier || !password) return errJson(request, 'Please fill in all fields.', 400);

  const accountId = await findAccountIdByIdentifier(env, identifier);
  const account = accountId ? await getAccount(env, accountId) : null;
  if (!account || !(await verifyPassword(password, account.passwordSalt, account.passwordHash))) {
    return errJson(request, 'Invalid credentials. Try again.', 401);
  }

  const reward = applyDailyReward(account);
  await saveAccount(env, account);

  const token = await createSession(env, account.id);
  return json(request, { token, account: accountForClient(account), reward });
}

async function handleMe(request, env) {
  const account = await getAccountFromRequest(request, env);
  if (!account) return errJson(request, 'Not authenticated.', 401);
  return json(request, { account: accountForClient(account) });
}

async function handleRedeem(request, env) {
  const account = await getAccountFromRequest(request, env);
  if (!account) return errJson(request, 'Not authenticated.', 401);
  const amount = account.balance || 0;
  account.balance = 0;
  account.playthroughBatches = [];
  await saveAccount(env, account);
  return json(request, { account: accountForClient(account), redeemed: amount });
}

async function handleDeposit(request, env) {
  const account = await getAccountFromRequest(request, env);
  if (!account) return errJson(request, 'Not authenticated.', 401);
  const { packId } = await readJsonBody(request);
  const pack = PACKS.find(p => p.id === packId);
  if (!pack) return errJson(request, 'Unknown pack.', 400);

  account.balance = (account.balance || 0) + pack.promo;
  account.gems = (account.gems || 0) + pack.gems;
  const batch = { id: 'pt_' + Date.now(), label: pack.name, total: pack.promo, remaining: pack.promo };
  account.playthroughBatches = [...(account.playthroughBatches || []), batch];
  account.totalPlaythroughRequired = (account.totalPlaythroughRequired || 0) + pack.promo;
  await saveAccount(env, account);

  return json(request, { account: accountForClient(account), pack });
}

async function handleListBets(request, env) {
  const account = await getAccountFromRequest(request, env);
  if (!account) return errJson(request, 'Not authenticated.', 401);
  const bets = await resolvePendingBets(env, account);
  return json(request, { bets, account: accountForClient(account) });
}

async function handlePlaceBet(request, env) {
  const account = await getAccountFromRequest(request, env);
  if (!account) return errJson(request, 'Not authenticated.', 401);

  const { legs, stake } = await readJsonBody(request);
  const stakeNum = parseFloat(stake);
  if (!Array.isArray(legs) || legs.length === 0) return errJson(request, 'Bet slip is empty.', 400);
  if (!stakeNum || stakeNum <= 0) return errJson(request, 'Invalid stake.', 400);
  if (stakeNum > (account.balance || 0)) return errJson(request, 'Insufficient funds.', 400);

  const toWin = calcPayout(stakeNum, legs);
  const combinedOdds = calcCombinedOdds(legs);
  const bet = {
    id: crypto.randomUUID(), accountId: account.id, legs, stake: stakeNum, toWin, combinedOdds,
    status: 'pending', placedAt: Date.now(),
  };
  await env.VOLTLINE_KV.put(`bet:${account.id}:${bet.id}`, JSON.stringify(bet));

  account.balance = (account.balance || 0) - stakeNum;
  account.bets = (account.bets || 0) + 1;
  let toDeduct = stakeNum;
  account.playthroughBatches = (account.playthroughBatches || []).map(b => {
    if (toDeduct <= 0) return b;
    const d = Math.min(b.remaining, toDeduct);
    toDeduct -= d;
    return { ...b, remaining: Math.max(0, b.remaining - d) };
  }).filter(b => b.remaining > 0.001);
  await saveAccount(env, account);

  return json(request, { bet, account: accountForClient(account) });
}

async function handleFindAccount(request, env, url) {
  const requester = await getAccountFromRequest(request, env);
  if (!requester) return errJson(request, 'Not authenticated.', 401);
  const q = (url.searchParams.get('q') || '').trim().replace(/^@/, '').toLowerCase();
  if (!q) return errJson(request, 'Missing query.', 400);

  const accountId = await findAccountIdByIdentifier(env, q);
  const account = accountId ? await getAccount(env, accountId) : null;
  if (!account || account.id === requester.id) return errJson(request, 'No user found with that username or email.', 404);
  return json(request, { account: publicAccount(account) });
}

async function handleBatchAccounts(request, env, url) {
  const requester = await getAccountFromRequest(request, env);
  if (!requester) return errJson(request, 'Not authenticated.', 401);
  const ids = (url.searchParams.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);
  const accounts = await Promise.all(ids.map(id => getAccount(env, id)));
  return json(request, { accounts: accounts.filter(Boolean).map(publicAccount) });
}

async function handleOdds(request, env, sport, url) {
  const debug = url.searchParams.get('debug') === '1';
  const result = await getOddsMap(env, sport, debug);
  if (debug) return json(request, { sport, ...result });
  return json(request, { sport, map: result });
}

async function handleAdminLogin(request, env) {
  const { password } = await readJsonBody(request);
  if (!env.ADMIN_PASSWORD || password !== env.ADMIN_PASSWORD) {
    return errJson(request, 'Access denied.', 403);
  }
  const token = crypto.randomUUID();
  await env.VOLTLINE_KV.put(`admin_session:${token}`, '1', { expirationTtl: ADMIN_SESSION_TTL });
  return json(request, { token });
}

async function handleAdminAccounts(request, env) {
  if (!(await requireAdmin(request, env))) return errJson(request, 'Not authenticated.', 401);
  const list = await env.VOLTLINE_KV.list({ prefix: 'account:' });
  const accounts = await Promise.all(list.keys.map(k => env.VOLTLINE_KV.get(k.name, 'json')));
  const real = accounts.filter(Boolean).map(accountForClient);
  return json(request, { accounts: [...MOCK_USERS, ...real] });
}

async function handleAdminBets(request, env) {
  if (!(await requireAdmin(request, env))) return errJson(request, 'Not authenticated.', 401);

  const accountsList = await env.VOLTLINE_KV.list({ prefix: 'account:' });
  const accounts = (await Promise.all(accountsList.keys.map(k => env.VOLTLINE_KV.get(k.name, 'json')))).filter(Boolean);

  // Resolve pending bets for every account so the admin view reflects real outcomes.
  await Promise.all(accounts.map(a => resolvePendingBets(env, a)));

  const betsList = await env.VOLTLINE_KV.list({ prefix: 'bet:' });
  const bets = (await Promise.all(betsList.keys.map(k => env.VOLTLINE_KV.get(k.name, 'json')))).filter(Boolean);
  const nameById = Object.fromEntries(accounts.map(a => [a.id, a.name]));
  const enriched = bets.map(b => ({ ...b, accountName: nameById[b.accountId] || 'Unknown' }));

  const totalVol = enriched.reduce((s, b) => s + (parseFloat(b.stake) || 0), 0);
  return json(request, { bets: enriched, totalVolume: totalVol, totalUsers: MOCK_USERS.length + accounts.length });
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request) });
    }

    try {
      if (pathname === '/api/signup' && request.method === 'POST') return await handleSignup(request, env);
      if (pathname === '/api/login' && request.method === 'POST') return await handleLogin(request, env);
      if (pathname === '/api/me' && request.method === 'GET') return await handleMe(request, env);
      if (pathname === '/api/me/redeem' && request.method === 'POST') return await handleRedeem(request, env);
      if (pathname === '/api/me/deposit' && request.method === 'POST') return await handleDeposit(request, env);
      if (pathname === '/api/bets' && request.method === 'GET') return await handleListBets(request, env);
      if (pathname === '/api/bets' && request.method === 'POST') return await handlePlaceBet(request, env);
      if (pathname === '/api/accounts/find' && request.method === 'GET') return await handleFindAccount(request, env, url);
      if (pathname === '/api/accounts/batch' && request.method === 'GET') return await handleBatchAccounts(request, env, url);
      if (pathname.startsWith('/api/odds/') && request.method === 'GET') {
        return await handleOdds(request, env, decodeURIComponent(pathname.slice('/api/odds/'.length)), url);
      }
      if (pathname === '/api/admin/login' && request.method === 'POST') return await handleAdminLogin(request, env);
      if (pathname === '/api/admin/accounts' && request.method === 'GET') return await handleAdminAccounts(request, env);
      if (pathname === '/api/admin/bets' && request.method === 'GET') return await handleAdminBets(request, env);

      return errJson(request, 'Not found.', 404);
    } catch (e) {
      return errJson(request, 'Internal error: ' + (e && e.message), 500);
    }
  },
};
