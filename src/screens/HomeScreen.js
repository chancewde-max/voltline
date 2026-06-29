import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, SCREEN_W, money } from '../constants';
import BottomNav from '../components/BottomNav';
import Ticker from '../components/Ticker';

const SPORTS = ['NBA', 'NFL', 'Soccer', 'NHL', 'Tennis', 'UFC', 'Boxing'];

const CARD_W = (SCREEN_W - 36 - 8) / 2; // 36 = 2×18px padding, 8 = gap

const GAMES = [
  {
    id: 'g1', period: '● Q4', sport: 'NBA', featured: true,
    teams: [
      { abbr: 'LAL', score: '108', leading: false, featuredLeader: false },
      { abbr: 'BOS', score: '112', leading: true,  featuredLeader: true  },
    ],
  },
  {
    id: 'g2', period: '● Q3', sport: 'NBA', featured: false,
    teams: [
      { abbr: 'GSW', score: '89', leading: false },
      { abbr: 'MIL', score: '94', leading: true  },
    ],
    staticOdds: '+135',
  },
  {
    id: 'g3', period: '● H2', sport: 'NBA', featured: false,
    teams: [
      { abbr: 'MIA', score: '76', leading: false },
      { abbr: 'NYK', score: '81', leading: true  },
    ],
    staticOdds: '+165',
  },
  {
    id: 'g4', period: '● 3Q', sport: 'NFL', featured: false,
    teams: [
      { abbr: 'KC', score: '24', leading: true  },
      { abbr: 'SF', score: '17', leading: false },
    ],
    staticOdds: '-120',
  },
];

export default function HomeScreen({ promoCash, bosOdds, gameTime, navigate }) {
  const insets = useSafeAreaInsets();

  // Pulsing live dot
  const dotScale   = useRef(new Animated.Value(1)).current;
  const dotOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(dotScale,   { toValue: 1.7, duration: 500, useNativeDriver: true }),
          Animated.timing(dotOpacity, { toValue: 0.4, duration: 500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(dotScale,   { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(dotOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

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
        {SPORTS.map((sp, i) => (
          <TouchableOpacity key={sp} style={[s.tab, i === 0 && s.tabActive]} activeOpacity={0.7}>
            <Text style={[s.tabTxt, i === 0 && s.tabTxtActive]}>{sp}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Scrollable body */}
      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        {/* Live header */}
        <View style={s.liveRow}>
          <View style={s.liveLeft}>
            <Animated.View style={[s.liveDot, { transform: [{ scale: dotScale }], opacity: dotOpacity }]} />
            <Text style={s.liveTitle}>Live Games</Text>
            <Text style={s.liveCount}>23</Text>
          </View>
          <Text style={s.seeAll}>See all →</Text>
        </View>

        {/* Game grid */}
        <View style={s.grid}>
          {GAMES.map(game => (
            <GameCard key={game.id} game={game} bosOdds={bosOdds} />
          ))}
        </View>

        {/* Active bets */}
        <View style={s.betsBox}>
          <View style={s.betsTop}>
            <Text style={s.betsTitle}>Active Bets</Text>
            <View style={s.betsMeta}>
              <Text style={s.betsToday}>+$48 today</Text>
              <View style={s.openBadge}><Text style={s.openText}>4 open</Text></View>
            </View>
          </View>
          <BetRow label={`BOS ML — ${bosOdds}`} detail="$50 stake · to win $62.50" amount="+$12.50" status="Winning" win />
          <BetRow label="MIL -4 SPRD" detail="$25 stake · to win $22.73" amount="-$2.73" status="Trailing" win={false} />
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      <Ticker bosTime={gameTime} />
      <BottomNav current="home" navigate={navigate} />
    </View>
  );
}

function GameCard({ game, bosOdds }) {
  const odds = game.id === 'g1' ? bosOdds : game.staticOdds;
  return (
    <View style={[s.card, game.featured && s.cardFeatured]}>
      <View style={s.cardHead}>
        <Text style={s.cardPeriod}>{game.period}</Text>
        <Text style={s.cardSport}>{game.sport}</Text>
      </View>
      <View style={s.cardTeams}>
        {game.teams.map((t, i) => (
          <View key={t.abbr} style={[s.teamRow, i < game.teams.length - 1 && { marginBottom: 3 }]}>
            <Text style={[s.teamAbbr, t.leading && s.teamAbbrLead, t.featuredLeader && s.teamAbbrFeat]}>{t.abbr}</Text>
            <Text style={[s.teamScore, t.leading && s.teamScoreLead, t.featuredLeader && s.teamScoreFeat]}>{t.score}</Text>
          </View>
        ))}
      </View>
      <View style={[s.oddsBox, game.featured && s.oddsBoxFeat]}>
        <Text style={[s.oddsText, game.featured && s.oddsTextFeat]}>{odds}</Text>
      </View>
    </View>
  );
}

function BetRow({ label, detail, amount, status, win }) {
  return (
    <View style={s.betRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.betLabel}>{label}</Text>
        <Text style={s.betDetail}>{detail}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[s.betAmt, win ? s.betAmtWin : s.betAmtLose]}>{amount}</Text>
        <Text style={s.betStatus}>{status}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: C.bg },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 },
  brand:         { fontFamily: F.raj, fontSize: 21, letterSpacing: 1, color: C.white },
  brandAccent:   { color: C.cyan },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balLabel:      { fontFamily: F.grotesk, fontSize: 9, color: C.dimmer, textTransform: 'uppercase', letterSpacing: 1, textAlign: 'right' },
  balAmount:     { fontFamily: F.monoBd, fontSize: 15, color: C.cyan, textShadowColor: 'rgba(0,240,245,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  avatar:        { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontFamily: F.groteskSm, fontSize: 11, color: 'white' },

  tabsRow:       { borderBottomWidth: 1, borderBottomColor: C.borderWeak, flexGrow: 0 },
  tabsContent:   { paddingLeft: 18 },
  tab:           { paddingVertical: 9, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:     { paddingLeft: 0, borderBottomColor: C.cyan, marginRight: 10 },
  tabTxt:        { fontFamily: F.groteskMd, fontSize: 12, color: C.dimmer },
  tabTxtActive:  { fontFamily: F.groteskBd, color: C.cyan },

  body:          { flex: 1 },

  liveRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10 },
  liveLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: C.red },
  liveTitle:     { fontFamily: F.raj, fontSize: 14, letterSpacing: 1.4, color: C.white, textTransform: 'uppercase' },
  liveCount:     { fontFamily: F.mono, fontSize: 10, color: C.red },
  seeAll:        { fontFamily: F.grotesk, fontSize: 11, color: C.cyan },

  grid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, paddingBottom: 12 },
  card:          { width: CARD_W, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 12 },
  cardFeatured:  { backgroundColor: C.bgCardGlow, borderColor: C.cyanBorderStrong },
  cardHead:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardPeriod:    { fontFamily: F.mono, fontSize: 8, color: C.red, letterSpacing: 0.8 },
  cardSport:     { fontFamily: F.mono, fontSize: 8, color: C.dim },
  cardTeams:     { marginBottom: 6 },
  teamRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamAbbr:      { fontFamily: F.raj, fontSize: 12, color: C.muted },
  teamAbbrLead:  { color: C.white },
  teamAbbrFeat:  { color: C.cyan },
  teamScore:     { fontFamily: F.monoBd, fontSize: 14, color: C.muted },
  teamScoreLead: { color: C.white },
  teamScoreFeat: { color: C.cyan, textShadowColor: 'rgba(0,240,245,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  oddsBox:       { paddingVertical: 5, paddingHorizontal: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 6, alignItems: 'center' },
  oddsBoxFeat:   { backgroundColor: 'rgba(0,240,245,0.12)', borderColor: C.cyanBorderMed },
  oddsText:      { fontFamily: F.monoBd, fontSize: 12, color: C.white },
  oddsTextFeat:  { color: C.cyan },

  betsBox:       { marginHorizontal: 18, backgroundColor: C.cyanGlow, borderWidth: 1, borderColor: C.cyanBorder, borderRadius: 13, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  betsTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  betsTitle:     { fontFamily: F.raj, fontSize: 14, letterSpacing: 1, color: C.white, textTransform: 'uppercase' },
  betsMeta:      { flexDirection: 'row', alignItems: 'center', gap: 7 },
  betsToday:     { fontFamily: F.mono, fontSize: 10, color: C.green },
  openBadge:     { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(0,240,245,0.12)', borderRadius: 4 },
  openText:      { fontFamily: F.mono, fontSize: 9, color: C.cyan },
  betRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  betLabel:      { fontFamily: F.groteskSm, fontSize: 12, color: C.muted },
  betDetail:     { fontFamily: F.mono, fontSize: 10, color: C.dimmer, marginTop: 1 },
  betAmt:        { fontFamily: F.monoBd, fontSize: 12 },
  betAmtWin:     { color: C.green },
  betAmtLose:    { color: C.red },
  betStatus:     { fontFamily: F.mono, fontSize: 9, color: C.dimmer },
});
