import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, SCREEN_W, money } from '../constants';
import { ESPN_URLS, parseESPN, FALLBACK } from '../bets';
import BottomNav from '../components/BottomNav';
import Ticker from '../components/Ticker';
import BetSlip from '../components/BetSlip';
import GameCard from '../components/GameCard';

const SCREEN_H = Dimensions.get('window').height;
const BANNER_H = SCREEN_H / 4;            // promo banner takes a quarter of the page
const SLIDE_W  = SCREEN_W - 36;           // full width minus 18px side padding
const DEFAULT_SPORTS = ['NBA', 'NFL', 'NHL'];

// Placeholder promotions — real campaigns will be slotted in here later.
const PROMOS = [
  { id: 'pr1', tag: 'WELCOME', title: 'Deposit match', sub: 'Get 100% promo cash on your first gem pack', colors: ['#00c0c8', '#0050ff'] },
  { id: 'pr2', tag: 'PARLAY BOOST', title: '+25% on 3+ legs', sub: 'Extra promo cash on every winning parlay', colors: ['#7b5cff', '#0050ff'] },
  { id: 'pr3', tag: 'DAILY', title: 'Free spin', sub: 'Come back each day for bonus gems', colors: ['#ff6a3d', '#ff2952'] },
];

// Rank live/upcoming games by how well they match the user's betting history.
export function rankSuggestions(games, history) {
  const teamFreq  = {};
  const sportFreq = {};
  for (const bet of history) {
    for (const leg of bet.legs) {
      teamFreq[leg.teamAbbr] = (teamFreq[leg.teamAbbr] || 0) + 1;
      sportFreq[leg.sport]   = (sportFreq[leg.sport] || 0) + 1;
    }
  }
  return games
    .map(g => {
      const favTeam = g.teams.find(t => teamFreq[t.abbr]);
      let score = 0;
      let reason = 'Trending pick';
      if (favTeam) {
        score += 100 + teamFreq[favTeam.abbr] * 10;
        reason = `Because you bet ${favTeam.abbr}`;
      } else if (sportFreq[g.sport]) {
        score += 40 + sportFreq[g.sport] * 5;
        reason = `More ${g.sport} for you`;
      }
      if (g.isLive) score += 8;            // nudge live games up
      return { game: g, score, reason };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export default function ForYouScreen({ promoCash, gameTime, navigate, betSlip, onAddBet, onPlaceBet, placedBets }) {
  const insets = useSafeAreaInsets();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [promoIdx, setPromoIdx] = useState(0);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    // Sports the user has wagered on, ranked by frequency, plus defaults so the
    // feed is never empty for a brand-new account.
    const sportFreq = {};
    placedBets.forEach(b => b.legs.forEach(l => { sportFreq[l.sport] = (sportFreq[l.sport] || 0) + 1; }));
    const fromHistory = Object.keys(sportFreq).sort((a, b) => sportFreq[b] - sportFreq[a]);
    const sports = [...new Set([...fromHistory, ...DEFAULT_SPORTS])].slice(0, 4);

    const all = [];
    await Promise.all(sports.map(async sport => {
      const url = ESPN_URLS[sport];
      try {
        if (url) {
          const data = await fetch(url).then(r => r.json());
          all.push(...parseESPN(data, sport));
        } else if (FALLBACK[sport]) {
          all.push(...FALLBACK[sport]);
        }
      } catch {
        if (FALLBACK[sport]) all.push(...FALLBACK[sport]);
      }
    }));

    // Only suggest games you can still bet on (Final games are locked).
    const bettable = all.filter(g => !g.isFinal);
    setSuggestions(rankSuggestions(bettable, placedBets));
    setLoading(false);
  }, [placedBets]);

  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  const hasHistory = placedBets.length > 0;

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

      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        {/* ── Promo banner (1/4 of the page) ── */}
        <View style={{ height: BANNER_H }}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.bannerScroll}
            onMomentumScrollEnd={e => setPromoIdx(Math.round(e.nativeEvent.contentOffset.x / SLIDE_W))}
          >
            {PROMOS.map(p => (
              <LinearGradient
                key={p.id}
                colors={p.colors}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[s.banner, { width: SLIDE_W }]}
              >
                <Text style={s.bannerTag}>{p.tag}</Text>
                <Text style={s.bannerTitle}>{p.title}</Text>
                <Text style={s.bannerSub}>{p.sub}</Text>
              </LinearGradient>
            ))}
          </ScrollView>
          <View style={s.dots}>
            {PROMOS.map((p, i) => (
              <View key={p.id} style={[s.dot, i === promoIdx && s.dotActive]} />
            ))}
          </View>
        </View>

        {/* ── For You feed ── */}
        <View style={s.feedHead}>
          <Text style={s.feedTitle}>For You</Text>
          <Text style={s.feedSub}>{hasHistory ? 'Based on your bets' : 'Popular right now'}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} />
        ) : suggestions.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyTxt}>No suggestions right now — check the Live tab.</Text>
          </View>
        ) : (
          <View style={s.feed}>
            {suggestions.map(({ game, reason }) => (
              <GameCard
                key={game.id}
                game={game}
                betSlip={betSlip}
                onAddBet={onAddBet}
                reason={reason}
                style={s.feedCard}
              />
            ))}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      <BetSlip betSlip={betSlip} onAddBet={onAddBet} onPlaceBet={onPlaceBet} promoCash={promoCash} />
      <Ticker bosTime={gameTime} />
      <BottomNav current="home" navigate={navigate} />
    </View>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: C.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 },
  brand:       { fontFamily: F.raj, fontSize: 21, letterSpacing: 1, color: C.white },
  brandAccent: { color: C.cyan },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balLabel:    { fontFamily: F.grotesk, fontSize: 9, color: C.dimmer, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' },
  balAmount:   { fontFamily: F.monoBd, fontSize: 15, color: C.cyan, textShadowColor: 'rgba(0,240,245,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  avatar:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontFamily: F.groteskSm, fontSize: 11, color: 'white' },

  body:        { flex: 1 },
  bannerScroll:{ paddingHorizontal: 18 },
  banner:      { flex: 1, borderRadius: 16, padding: 18, justifyContent: 'flex-end' },
  bannerTag:   { fontFamily: F.monoBd, fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: 1.5, marginBottom: 6 },
  bannerTitle: { fontFamily: F.raj, fontSize: 26, color: 'white', letterSpacing: 0.5 },
  bannerSub:   { fontFamily: F.groteskMd, fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  dots:        { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive:   { backgroundColor: C.cyan, width: 16 },

  feedHead:    { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 10 },
  feedTitle:   { fontFamily: F.raj, fontSize: 16, letterSpacing: 1.4, color: C.white, textTransform: 'uppercase' },
  feedSub:     { fontFamily: F.grotesk, fontSize: 11, color: C.dim },
  emptyBox:    { alignItems: 'center', paddingVertical: 50 },
  emptyTxt:    { fontFamily: F.mono, fontSize: 12, color: C.dim, textAlign: 'center', paddingHorizontal: 40 },

  feed:        { paddingHorizontal: 18, gap: 10 },
  feedCard:    { width: '100%' },
});
