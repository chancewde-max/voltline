// Shared sportsbook data + bet math.
// Used by the Live browser, the For You feed, and the BetSlip component.

export const ESPN_URLS = {
  NBA:         'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  NFL:         'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  Soccer:      'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
  NHL:         'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
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
    .slice(0, 8)
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
  Tennis: [
    { id: 't1', sport: 'Tennis', period: '● Set 2', isLive: true,  teams: [{ abbr: 'DJO', score: '6', leading: true  }, { abbr: 'ALC', score: '4', leading: false }], awayOdds: '-155', homeOdds: '+130' },
    { id: 't2', sport: 'Tennis', period: 'Final',   isLive: false, isFinal: true, teams: [{ abbr: 'SIN', score: '3', leading: false }, { abbr: 'MED', score: '3', leading: false }], awayOdds: '+110', homeOdds: '-125' },
  ],
  Boxing: [
    { id: 'b1', sport: 'Boxing', period: '● Rd 8',  isLive: true,  teams: [{ abbr: 'FUR', score: '—', leading: false }, { abbr: 'USY', score: '—', leading: false }], awayOdds: '+240', homeOdds: '-285' },
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

// Settle a placed bet against fetched ESPN events keyed by sport.
// A leg wins if its team has the top score in a Final game. A bet wins only
// when every leg wins (parlay rule); it stays 'pending' until all legs are
// Final. Pure so it can be unit-tested and reused by the resolver loop.
export function resolveBetStatus(bet, sportEvents) {
  const legResults = bet.legs.map(leg => {
    const events = sportEvents[leg.sport] || [];
    const ev = events.find(e => e.id === leg.gameId);
    if (!ev) return null;
    if (ev.status?.type?.description !== 'Final') return null;
    const comps = ev.competitions?.[0]?.competitors || [];
    const sorted = [...comps].sort((a, b) => parseInt(b.score || 0) - parseInt(a.score || 0));
    const wonAbbr = sorted[0]?.team?.abbreviation;
    return wonAbbr === leg.teamAbbr ? 'won' : 'lost';
  });
  if (legResults.some(r => r === null)) return 'pending';
  return legResults.some(r => r === 'lost') ? 'lost' : 'won';
}

export function calcPayout(stakeAmt, bets) {
  if (!stakeAmt || bets.length === 0) return 0;
  if (bets.length === 1) {
    const o = parseInt(bets[0].odds);
    return o > 0 ? stakeAmt * (o / 100) : stakeAmt * (100 / Math.abs(o));
  }
  const mult = bets.reduce((acc, b) => {
    const o = parseInt(b.odds);
    return acc * (o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o));
  }, 1);
  return stakeAmt * mult - stakeAmt;
}
