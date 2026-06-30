import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { C, F } from '../constants';

const LIVE_URLS = [
  { url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',   sport: 'NBA' },
  { url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',    sport: 'NFL' },
  { url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',    sport: 'MLB' },
  { url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',      sport: 'NHL' },
  { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',    sport: 'MLS' },
  { url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard', sport: 'WC' },
];

function buildTickerItems(events) {
  const items = [];
  for (const { ev, sport } of events) {
    const comp  = ev.competitions?.[0];
    const comps = comp?.competitors || [];
    const away  = comps.find(c => c.homeAway === 'away') || comps[0];
    const home  = comps.find(c => c.homeAway === 'home') || comps[1];
    const statusDesc = ev.status?.type?.description || '';
    const isLive  = statusDesc === 'In Progress';
    const isFinal = statusDesc === 'Final';
    if (!isLive && !isFinal) continue;
    const awayAbbr  = away?.team?.abbreviation || '???';
    const homeAbbr  = home?.team?.abbreviation || '???';
    const awayScore = away?.score || '0';
    const homeScore = home?.score || '0';
    const period = comp?.status?.period || 1;
    const clock  = comp?.status?.displayClock || '';
    let periodStr;
    if (isLive) {
      if (sport === 'NBA' || sport === 'NFL') periodStr = `Q${period} ${clock}`;
      else if (sport === 'NHL')               periodStr = `P${period} ${clock}`;
      else if (sport === 'MLB')               periodStr = `T${period}`;
      else                                    periodStr = `${clock}'`;
    } else {
      periodStr = 'Final';
    }
    const prefix = isLive ? '● ' : '';
    const color  = isLive ? C.cyan : (parseInt(awayScore) > parseInt(homeScore) ? C.green : C.dim);
    items.push({ text: `${prefix}${awayAbbr} ${awayScore} – ${homeAbbr} ${homeScore} ${periodStr}`, color, live: isLive });
  }
  return items;
}

const STATIC_FALLBACK = [
  { text: 'GSW 89 – MIL 94 Q3 5:12', color: C.dim },
  { text: "MCI 1 – ARS 2 72'",        color: C.dim },
  { text: 'PHX 98 – DAL 101 Final',   color: C.green },
  { text: '● NYY 3 – BOS 1 T7',       color: C.cyan },
];

export default function Ticker({ bosTime }) {
  const translateX  = useRef(new Animated.Value(0)).current;
  const animRef     = useRef(null);
  const [halfW, setHalfW]     = useState(0);
  const [liveItems, setLiveItems] = useState([]);

  const fetchTicker = useCallback(async () => {
    try {
      const results = await Promise.all(LIVE_URLS.map(({ url, sport }) =>
        fetch(url).then(r => r.json()).then(d => ({ data: d, sport })).catch(() => null)
      ));
      const events = [];
      for (const res of results) {
        if (!res) continue;
        for (const ev of (res.data.events || [])) {
          const desc = ev.status?.type?.description || '';
          if (desc === 'In Progress' || desc === 'Final') {
            events.push({ ev, sport: res.sport });
          }
        }
      }
      const items = buildTickerItems(events);
      if (items.length > 0) setLiveItems(items);
    } catch { /* keep existing items */ }
  }, []);

  useEffect(() => {
    fetchTicker();
    const t = setInterval(fetchTicker, 60000);
    return () => clearInterval(t);
  }, [fetchTicker]);

  const startAnim = (hw) => {
    if (animRef.current) animRef.current.stop();
    translateX.setValue(0);
    animRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -hw,
        duration: 28000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animRef.current.start();
  };

  const onLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== halfW * 2) {
      const hw = w / 2;
      setHalfW(hw);
      startAnim(hw);
    }
  };

  useEffect(() => () => { if (animRef.current) animRef.current.stop(); }, []);

  const baseItems = liveItems.length > 0 ? liveItems : STATIC_FALLBACK;
  const items = [...baseItems, ...baseItems];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.track, { transform: [{ translateX }] }]}
        onLayout={onLayout}
      >
        {items.map((item, i) => (
          <Text key={i} style={[styles.item, { color: item.color }]}>
            {item.text}{'   '}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 27,
    backgroundColor: 'rgba(0,0,8,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,240,245,0.2)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    fontFamily: F.mono,
    fontSize: 9,
    paddingHorizontal: 16,
  },
});
