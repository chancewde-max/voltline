// The Odds API integration — https://the-odds-api.com
// Free tier: 500 requests/month. Set your key below.
export const ODDS_API_KEY = '311547d4bddf62ae644194bd9f3a9a5d';

const SPORT_KEYS = {
  NBA: 'basketball_nba',
  NFL: 'americanfootball_nfl',
  MLB: 'baseball_mlb',
  NHL: 'icehockey_nhl',
};

// The Odds API team full names → ESPN abbreviations
const TEAM_ABBR = {
  // NBA
  'Atlanta Hawks':'ATL','Boston Celtics':'BOS','Brooklyn Nets':'BKN',
  'Charlotte Hornets':'CHA','Chicago Bulls':'CHI','Cleveland Cavaliers':'CLE',
  'Dallas Mavericks':'DAL','Denver Nuggets':'DEN','Detroit Pistons':'DET',
  'Golden State Warriors':'GSW','Houston Rockets':'HOU','Indiana Pacers':'IND',
  'Los Angeles Clippers':'LAC','Los Angeles Lakers':'LAL','Memphis Grizzlies':'MEM',
  'Miami Heat':'MIA','Milwaukee Bucks':'MIL','Minnesota Timberwolves':'MIN',
  'New Orleans Pelicans':'NOP','New York Knicks':'NYK','Oklahoma City Thunder':'OKC',
  'Orlando Magic':'ORL','Philadelphia 76ers':'PHI','Phoenix Suns':'PHX',
  'Portland Trail Blazers':'POR','Sacramento Kings':'SAC','San Antonio Spurs':'SAS',
  'Toronto Raptors':'TOR','Utah Jazz':'UTA','Washington Wizards':'WAS',
  // NFL
  'Arizona Cardinals':'ARI','Atlanta Falcons':'ATL','Baltimore Ravens':'BAL',
  'Buffalo Bills':'BUF','Carolina Panthers':'CAR','Chicago Bears':'CHI',
  'Cincinnati Bengals':'CIN','Cleveland Browns':'CLE','Dallas Cowboys':'DAL',
  'Denver Broncos':'DEN','Detroit Lions':'DET','Green Bay Packers':'GB',
  'Houston Texans':'HOU','Indianapolis Colts':'IND','Jacksonville Jaguars':'JAX',
  'Kansas City Chiefs':'KC','Las Vegas Raiders':'LV','Los Angeles Chargers':'LAC',
  'Los Angeles Rams':'LAR','Miami Dolphins':'MIA','Minnesota Vikings':'MIN',
  'New England Patriots':'NE','New Orleans Saints':'NO','New York Giants':'NYG',
  'New York Jets':'NYJ','Philadelphia Eagles':'PHI','Pittsburgh Steelers':'PIT',
  'San Francisco 49ers':'SF','Seattle Seahawks':'SEA','Tampa Bay Buccaneers':'TB',
  'Tennessee Titans':'TEN','Washington Commanders':'WSH',
  // MLB
  'Arizona Diamondbacks':'ARI','Atlanta Braves':'ATL','Baltimore Orioles':'BAL',
  'Boston Red Sox':'BOS','Chicago Cubs':'CHC','Chicago White Sox':'CWS',
  'Cincinnati Reds':'CIN','Cleveland Guardians':'CLE','Colorado Rockies':'COL',
  'Detroit Tigers':'DET','Houston Astros':'HOU','Kansas City Royals':'KC',
  'Los Angeles Angels':'LAA','Los Angeles Dodgers':'LAD','Miami Marlins':'MIA',
  'Milwaukee Brewers':'MIL','Minnesota Twins':'MIN','New York Mets':'NYM',
  'New York Yankees':'NYY','Oakland Athletics':'OAK','Philadelphia Phillies':'PHI',
  'Pittsburgh Pirates':'PIT','San Diego Padres':'SD','San Francisco Giants':'SF',
  'Seattle Mariners':'SEA','St. Louis Cardinals':'STL','Tampa Bay Rays':'TB',
  'Texas Rangers':'TEX','Toronto Blue Jays':'TOR','Washington Nationals':'WSH',
  // NHL
  'Anaheim Ducks':'ANA','Boston Bruins':'BOS','Buffalo Sabres':'BUF',
  'Calgary Flames':'CGY','Carolina Hurricanes':'CAR','Chicago Blackhawks':'CHI',
  'Colorado Avalanche':'COL','Columbus Blue Jackets':'CBJ','Dallas Stars':'DAL',
  'Detroit Red Wings':'DET','Edmonton Oilers':'EDM','Florida Panthers':'FLA',
  'Los Angeles Kings':'LAK','Minnesota Wild':'MIN','Montreal Canadiens':'MTL',
  'Nashville Predators':'NSH','New Jersey Devils':'NJD','New York Islanders':'NYI',
  'New York Rangers':'NYR','Ottawa Senators':'OTT','Philadelphia Flyers':'PHI',
  'Pittsburgh Penguins':'PIT','San Jose Sharks':'SJS','Seattle Kraken':'SEA',
  'St. Louis Blues':'STL','Tampa Bay Lightning':'TBL','Toronto Maple Leafs':'TOR',
  'Utah Hockey Club':'UTA','Vancouver Canucks':'VAN','Vegas Golden Knights':'VGK',
  'Washington Capitals':'WSH','Winnipeg Jets':'WPG',
};

function fmt(price) {
  return price > 0 ? `+${price}` : `${price}`;
}

// Cache results for 5 minutes to protect the 500/month free tier
const cache = {};
const CACHE_TTL = 5 * 60 * 1000;

export async function enrichGamesWithOdds(games, sport) {
  if (!ODDS_API_KEY || !SPORT_KEYS[sport]) return games;

  const cacheKey = sport;
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return mergeOdds(games, cached.data);
  }

  try {
    const url =
      `https://api.the-odds-api.com/v4/sports/${SPORT_KEYS[sport]}/odds` +
      `?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
    const data = await fetch(url).then(r => r.json());
    if (!Array.isArray(data)) return games;
    cache[cacheKey] = { ts: Date.now(), data };
    return mergeOdds(games, data);
  } catch {
    return games;
  }
}

function mergeOdds(games, events) {
  // Build lookup: "AWAY-HOME" → real odds data
  const oddsMap = {};
  for (const ev of events) {
    const awayAbbr = TEAM_ABBR[ev.away_team];
    const homeAbbr = TEAM_ABBR[ev.home_team];
    if (!awayAbbr || !homeAbbr) continue;

    const bk = ev.bookmakers?.[0];
    if (!bk) continue;

    const h2h     = bk.markets?.find(m => m.key === 'h2h');
    const spreads = bk.markets?.find(m => m.key === 'spreads');
    const totals  = bk.markets?.find(m => m.key === 'totals');

    const entry = {};

    if (h2h) {
      const awayH2H = h2h.outcomes.find(o => TEAM_ABBR[o.name] === awayAbbr);
      const homeH2H = h2h.outcomes.find(o => TEAM_ABBR[o.name] === homeAbbr);
      if (awayH2H && homeH2H) {
        entry.awayOdds = fmt(awayH2H.price);
        entry.homeOdds = fmt(homeH2H.price);
      }
    }

    if (spreads) {
      const awaySpread = spreads.outcomes.find(o => TEAM_ABBR[o.name] === awayAbbr);
      const homeSpread = spreads.outcomes.find(o => TEAM_ABBR[o.name] === homeAbbr);
      if (awaySpread && homeSpread) {
        const awayPt = awaySpread.point ?? 0;
        entry.awaySpreadLine = awayPt > 0 ? `+${awayPt}` : `${awayPt}`;
        entry.awaySpreadOdds = fmt(awaySpread.price);
        entry.homeSpreadLine = homeSpread.point > 0 ? `+${homeSpread.point}` : `${homeSpread.point}`;
        entry.homeSpreadOdds = fmt(homeSpread.price);
      }
    }

    if (totals) {
      const over  = totals.outcomes.find(o => o.name === 'Over');
      const under = totals.outcomes.find(o => o.name === 'Under');
      if (over && under) {
        entry.totalLine = over.point;
        entry.overOdds  = fmt(over.price);
        entry.underOdds = fmt(under.price);
      }
    }

    oddsMap[`${awayAbbr}-${homeAbbr}`] = entry;
  }

  return games.map(game => {
    const key = `${game.teams[0].abbr}-${game.teams[1].abbr}`;
    const real = oddsMap[key];
    return real ? { ...game, ...real } : game;
  });
}
