// Shared sportsbook data + bet math.
// Used by the Live browser, the For You feed, and the BetSlip component.

export const ESPN_URLS = {
  NBA:         'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  NFL:         'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  Soccer:      'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
  NHL:         'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  MLB:         'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  UFC:         'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard',
  'World Cup': 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
};

export const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export function strHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function deterministicOdds(seed) {
  const n = seed % 300;
  return n < 150 ? `+${110 + (n % 90)}` : `-${115 + (n % 90)}`;
}

export function parseESPN(data, sport) {
  const now = Date.now();
  return (data.events || [])
    .filter(ev => Math.abs(new Date(ev.date).getTime() - now) <= SEVEN_DAYS)
    .map(ev => {
      const comp = ev.competitions?.[0];
      const comps = comp?.competitors || [];
      const away = comps.find(c => c.homeAway === 'away') || comps[0];
      const home = comps.find(c => c.homeAway === 'home') || comps[1];
      const statusDesc = ev.status?.type?.description || '';
      const isLive = statusDesc === 'In Progress';
      const isFinal = statusDesc === 'Final';
      const period = comp?.status?.period || 1;
      const clock = comp?.status?.displayClock || '';
      let periodStr;
      if (isLive) {
        if (sport === 'NBA') periodStr = `● Q${period} ${clock}`;
        else if (sport === 'NFL') periodStr = `● Q${period} ${clock}`;
        else if (sport === 'Soccer' || sport === 'World Cup') periodStr = `● ${clock}'`;
        else if (sport === 'NHL') periodStr = `● P${period} ${clock}`;
        else if (sport === 'MLB') periodStr = `● T${period}`;
        else periodStr = '● LIVE';
      } else if (isFinal) {
        periodStr = 'Final';
      } else {
        const d = new Date(ev.date);
        periodStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      const awayAbbr = away?.team?.abbreviation || 'TBD';
      const homeAbbr = home?.team?.abbreviation || 'TBD';
      const awayScore = away?.score || (isFinal ? '0' : '—');
      const homeScore = home?.score || (isFinal ? '0' : '—');
      const aNum = parseInt(awayScore) || 0;
      const hNum = parseInt(homeScore) || 0;
      return {
        id: ev.id,
        sport,
        period: periodStr,
        date: ev.date,
        isLive,
        isFinal,
        teams: [
          { abbr: awayAbbr, score: awayScore, leading: aNum > hNum },
          { abbr: homeAbbr, score: homeScore, leading: hNum > aNum },
        ],
        awayOdds: deterministicOdds(strHash(awayAbbr + ev.id)),
        homeOdds: deterministicOdds(strHash(homeAbbr + ev.id)),
      };
    });
}

export const FALLBACK = {
  MLB: [
    { id: 'ml1', sport: 'MLB', period: '● T7', isLive: true,  isFinal: false, teams: [{ abbr: 'NYY', score: '3', leading: true  }, { abbr: 'BOS', score: '1', leading: false }], awayOdds: '-155', homeOdds: '+132' },
    { id: 'ml2', sport: 'MLB', period: '7:10 PM', isLive: false, isFinal: false, teams: [{ abbr: 'LAD', score: '—', leading: false }, { abbr: 'SF',  score: '—', leading: false }], awayOdds: '-175', homeOdds: '+148' },
    { id: 'ml3', sport: 'MLB', period: '8:05 PM', isLive: false, isFinal: false, teams: [{ abbr: 'ATL', score: '—', leading: false }, { abbr: 'MIA', score: '—', leading: false }], awayOdds: '-130', homeOdds: '+110' },
  ],
  NBA: [
    { id: 'nb1', sport: 'NBA', period: '8:00 PM', isLive: false, isFinal: false, teams: [{ abbr: 'BOS', score: '—', leading: false }, { abbr: 'NYK', score: '—', leading: false }], awayOdds: '-140', homeOdds: '+118' },
    { id: 'nb2', sport: 'NBA', period: '10:30 PM', isLive: false, isFinal: false, teams: [{ abbr: 'LAL', score: '—', leading: false }, { abbr: 'GSW', score: '—', leading: false }], awayOdds: '+105', homeOdds: '-125' },
  ],
  NFL: [
    { id: 'nf1', sport: 'NFL', period: 'Sun 1:00 PM', isLive: false, isFinal: false, teams: [{ abbr: 'KC', score: '—', leading: false }, { abbr: 'BUF', score: '—', leading: false }], awayOdds: '-110', homeOdds: '-110' },
    { id: 'nf2', sport: 'NFL', period: 'Sun 4:25 PM', isLive: false, isFinal: false, teams: [{ abbr: 'SF', score: '—', leading: false }, { abbr: 'DAL', score: '—', leading: false }], awayOdds: '-155', homeOdds: '+132' },
  ],
  NHL: [
    { id: 'nh1', sport: 'NHL', period: '7:00 PM', isLive: false, isFinal: false, teams: [{ abbr: 'TOR', score: '—', leading: false }, { abbr: 'MTL', score: '—', leading: false }], awayOdds: '+120', homeOdds: '-142' },
  ],
  Soccer: [
    { id: 's1', sport: 'Soccer', period: '● 67\'', isLive: true,  isFinal: false, teams: [{ abbr: 'MCI', score: '2', leading: true  }, { abbr: 'ARS', score: '1', leading: false }], awayOdds: '-165', homeOdds: '+140' },
  ],
  Tennis: [
    { id: 't1', sport: 'Tennis', period: '● Set 2', isLive: true,  isFinal: false, teams: [{ abbr: 'DJO', score: '6', leading: true  }, { abbr: 'ALC', score: '4', leading: false }], awayOdds: '-155', homeOdds: '+130' },
    { id: 't2', sport: 'Tennis', period: 'Final',   isLive: false, isFinal: true,  teams: [{ abbr: 'SIN', score: '3', leading: false }, { abbr: 'MED', score: '3', leading: false }], awayOdds: '+110', homeOdds: '-125' },
  ],
  Boxing: [
    { id: 'b1', sport: 'Boxing', period: '● Rd 8',  isLive: true,  isFinal: false, teams: [{ abbr: 'FUR', score: '—', leading: false }, { abbr: 'USY', score: '—', leading: false }], awayOdds: '+240', homeOdds: '-285' },
  ],
};

export function calcCombinedOdds(bets) {
  if (bets.length === 0) return '';
  if (bets.length === 1) return bets[0].odds;
  const dec = bets.reduce((acc, b) => {
    const o = parseInt(b.odds);
    return acc * (o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o));
  }, 1);
  const profit = (dec - 1) * 100;
  return dec >= 2 ? `+${Math.round(profit)}` : `-${Math.round(10000 / profit)}`;
}

// Human-readable label for a bet leg, matching what market it's actually in
// (moneyline/spread/total legs all store the pick in teamAbbr, so the label
// has to branch on market to avoid calling every leg "Moneyline").
export function legLabel(leg) {
  if (leg.market === 'spr') return `${leg.teamAbbr} ${leg.line > 0 ? '+' : ''}${leg.line} Spread`;
  if (leg.market === 'ou') return `${leg.side === 'under' ? 'Under' : 'Over'} ${leg.line}`;
  if (leg.market === 'prop') return leg.teamAbbr;
  return `${leg.teamAbbr} Moneyline`;
}

// Grades one leg against its Final ESPN event. Only 'ml' (moneyline), 'spr'
// (spread), and 'ou' (total) legs carry real, checkable outcomes; legacy legs
// with no market default to 'ml' for backward compatibility with bets placed
// before markets were tracked. 'prop' legs are decorative (there's no real
// scoreboard data for things like "Rebounds O/U") and can never be verified,
// so they're left out of resolution entirely by the caller.
function gradeLeg(leg, ev) {
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
    return (leg.side === 'over') === overWon ? 'won' : 'lost';
  }

  if (leg.market === 'spr') {
    const team = comps.find(c => c.team?.abbreviation === leg.teamAbbr);
    const opp = comps.find(c => c.team?.abbreviation !== leg.teamAbbr);
    if (!team || !opp) return null;
    const line = parseFloat(leg.line);
    if (Number.isNaN(line)) return null;
    const adjusted = parseInt(team.score || '0', 10) + line;
    const oppScore = parseInt(opp.score || '0', 10);
    if (adjusted === oppScore) return 'push';
    return adjusted > oppScore ? 'won' : 'lost';
  }

  // Moneyline (default for legacy legs with no market field)
  if (score0 === score1) return 'push';
  const winnerAbbr = (score0 > score1 ? c0 : c1).team?.abbreviation;
  return winnerAbbr === leg.teamAbbr ? 'won' : 'lost';
}

// Settle a placed bet against fetched ESPN events keyed by sport.
// A bet wins only when every (resolvable) leg wins or pushes; it stays
// 'pending' until every resolvable leg's game is Final. Pure so it can be
// unit-tested and reused by the resolver loop.
export function resolveBetStatus(bet, sportEvents) {
  const legResults = bet.legs.map(leg => {
    if (leg.market === 'prop') return 'push'; // unresolvable — never affects the outcome
    const events = sportEvents[leg.sport] || [];
    const ev = events.find(e => e.id === leg.gameId);
    if (!ev) return null;
    if (ev.status?.type?.description !== 'Final') return null;
    return gradeLeg(leg, ev);
  });
  if (legResults.some(r => r === null)) return 'pending';
  if (legResults.some(r => r === 'lost')) return 'lost';
  return legResults.every(r => r === 'push') ? 'push' : 'won';
}

export function calcPayout(stakeAmt, bets) {
  if (!stakeAmt || bets.length === 0) return 0;
  if (bets.length === 1) {
    const o = parseInt(bets[0].odds);
    const profit = o > 0 ? stakeAmt * (o / 100) : stakeAmt * (100 / Math.abs(o));
    return stakeAmt + profit;
  }
  const mult = bets.reduce((acc, b) => {
    const o = parseInt(b.odds);
    return acc * (o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o));
  }, 1);
  return stakeAmt * mult;
}
