import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, SCREEN_W, money } from '../constants';
import { ESPN_URLS, parseESPN, FALLBACK } from '../bets';
import BottomNav from '../components/BottomNav';
import Ticker from '../components/Ticker';
import BetSlip from '../components/BetSlip';
import GameCard from '../components/GameCard';

const SPORTS = ['NBA', 'NFL', 'MLB', 'Soccer', 'NHL', 'Tennis', 'UFC', 'Boxing', 'World Cup'];
const CARD_W = (SCREEN_W - 36 - 8) / 2;

export default function LiveScreen({ promoCash, gameTime, navigate, betSlip, onAddBet, onPlaceBet }) {
  const insets = useSafeAreaInsets();
  const [activeSport, setActiveSport] = useState('NBA');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const dotScale   = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(dotScale,   { toValue: 1.7, duration: 500, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 0.4, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(dotScale,   { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(dotOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);

  const fetchGames = useCallback(async (sport) => {
    setLoading(true);
    const url = ESPN_URLS[sport];
    if (!url) {
      setGames(FALLBACK[sport] || []);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(url);
      const data = await res.json();
      const parsed = parseESPN(data, sport);
      setGames(parsed.length > 0 ? parsed : (FALLBACK[sport] || []));
    } catch {
      setGames(FALLBACK[sport] || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGames(activeSport); setShowAll(false); }, [activeSport]);

  const liveCount  = games.filter(g => g.isLive).length;
  const visibleGames = showAll ? games : games.slice(0, 8);

  // Group games by calendar date for the "See all" expanded view
  const groupedByDate = showAll ? (() => {
    const map = {};
    for (const g of games) {
      const key = g.isLive ? '● LIVE NOW' : g.isFinal ? 'FINAL' : (() => {
        const d = new Date(g.date || Date.now());
        const today = new Date(); today.setHours(0,0,0,0);
        const diff = Math.round((d - today) / 86400000);
        if (diff === 0) return 'TODAY';
        if (diff === 1) return 'TOMORROW';
        if (diff === -1) return 'YESTERDAY';
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
      })();
      if (!map[key]) map[key] = [];
      map[key].push(g);
    }
    // Sort: live first, then future dates, then final
    const order = ['● LIVE NOW', 'TODAY', 'TOMORROW'];
    return Object.entries(map).sort(([a], [b]) => {
      const ai = order.indexOf(a); const bi = order.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      if (a === 'FINAL') return 1;
      if (b === 'FINAL') return -1;
      return a.localeCompare(b);
    });
  })() : null;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.brand}>VOLT<Text style={s.brandAccent}>LINE</Text></Text>
        <View style={s.headerRight}>
          <View>
            <Text style={s.balLabel}>Balance</Text>
            <Text style={s.balAmount}>{money(promoCash)}</Text>
          </View>
          <TouchableOpacity onPress={() => navigate('account')} activeOpacity={0.85}>
            <LinearGradient colors={['#00c0c8', '#0050ff']} style={s.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={s.avatarText}>JD</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sport tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsRow} contentContainerStyle={s.tabsContent}>
        {SPORTS.map(sp => (
          <TouchableOpacity key={sp} style={[s.tab, activeSport === sp && s.tabActive]} activeOpacity={0.7} onPress={() => setActiveSport(sp)}>
            <Text style={[s.tabTxt, activeSport === sp && s.tabTxtActive]}>{sp}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Body */}
      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.liveRow}>
          <View style={s.liveLeft}>
            <Animated.View style={[s.liveDot, { transform: [{ scale: dotScale }], opacity: dotOpacity }]} />
            <Text style={s.liveTitle}>{showAll ? `All ${activeSport}` : `Live ${activeSport}`}</Text>
            {liveCount > 0 && <Text style={s.liveCount}>{liveCount}</Text>}
          </View>
          {games.length > 8 && (
            <TouchableOpacity onPress={() => setShowAll(v => !v)} activeOpacity={0.7}>
              <Text style={s.seeAll}>{showAll ? '← Less' : `See all ${games.length} →`}</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} />
        ) : games.length === 0 ? (
          <View style={s.emptyBox}><Text style={s.emptyTxt}>No events right now</Text></View>
        ) : showAll ? (
          // Expanded view: games grouped by date
          groupedByDate.map(([dateLabel, dayGames]) => (
            <View key={dateLabel}>
              <View style={s.dateHeader}>
                <Text style={s.dateHeaderTxt}>{dateLabel}</Text>
                <Text style={s.dateCount}>{dayGames.length} game{dayGames.length !== 1 ? 's' : ''}</Text>
              </View>
              <View style={s.grid}>
                {dayGames.map((game, idx) => (
                  <GameCard key={game.id} game={game} featured={false} betSlip={betSlip} onAddBet={onAddBet} style={{ width: CARD_W }} />
                ))}
              </View>
            </View>
          ))
        ) : (
          // Default view: top 8 in a grid
          <View style={s.grid}>
            {visibleGames.map((game, idx) => (
              <GameCard key={game.id} game={game} featured={idx === 0} betSlip={betSlip} onAddBet={onAddBet} style={{ width: CARD_W }} />
            ))}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <BetSlip betSlip={betSlip} onAddBet={onAddBet} onPlaceBet={onPlaceBet} promoCash={promoCash} />
      <Ticker bosTime={gameTime} />
      <BottomNav current="live" navigate={navigate} />
    </View>
  );
}

const s = StyleSheet.create({
  screen:          { flex: 1, backgroundColor: C.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 },
  brand:           { fontFamily: F.raj, fontSize: 21, letterSpacing: 1, color: C.white },
  brandAccent:     { color: C.cyan },
  headerRight:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balLabel:        { fontFamily: F.grotesk, fontSize: 9, color: C.dimmer, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' },
  balAmount:       { fontFamily: F.monoBd, fontSize: 15, color: C.cyan, textShadowColor: 'rgba(0,240,245,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  avatar:          { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText:      { fontFamily: F.groteskSm, fontSize: 11, color: 'white' },

  tabsRow:         { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', flexGrow: 0 },
  tabsContent:     { paddingLeft: 18 },
  tab:             { paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:       { paddingLeft: 0, borderBottomColor: C.cyan, marginRight: 10 },
  tabTxt:          { fontFamily: F.groteskMd, fontSize: 12, color: C.dimmer },
  tabTxtActive:    { fontFamily: F.groteskBd, color: C.cyan },

  body:            { flex: 1 },
  liveRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10 },
  liveLeft:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red },
  liveTitle:       { fontFamily: F.raj, fontSize: 14, letterSpacing: 1.4, color: C.white, textTransform: 'uppercase' },
  liveCount:       { fontFamily: F.mono, fontSize: 10, color: C.red },
  seeAll:          { fontFamily: F.grotesk, fontSize: 11, color: C.cyan },
  dateHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  dateHeaderTxt:   { fontFamily: F.groteskBd, fontSize: 11, color: C.dim, letterSpacing: 1.2 },
  dateCount:       { fontFamily: F.mono, fontSize: 10, color: C.dimmer },
  emptyBox:        { alignItems: 'center', paddingVertical: 50 },
  emptyTxt:        { fontFamily: F.mono, fontSize: 12, color: C.dim },

  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, paddingBottom: 12 },
});
