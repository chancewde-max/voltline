import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity,
  ActivityIndicator, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, SCREEN_W, money } from '../constants';
import BottomNav from '../components/BottomNav';
import Ticker from '../components/Ticker';

const SPORTS = ['NBA', 'NFL', 'Soccer', 'NHL', 'Tennis', 'UFC', 'Boxing'];
const CARD_W = (SCREEN_W - 36 - 8) / 2;

const ESPN_URLS = {
  NBA:    'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  NFL:    'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  Soccer: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
  NHL:    'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  UFC:    'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard',
};

function strHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function deterministicOdds(seed) {
  const n = seed % 300;
  return n < 150 ? `+${110 + (n % 90)}` : `-${115 + (n % 90)}`;
}

function parseESPN(data, sport) {
  return (data.events || []).slice(0, 8).map(ev => {
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
      else if (sport === 'Soccer') periodStr = `● ${clock}'`;
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
      teams: [
        { abbr: awayAbbr, score: awayScore, leading: aNum > hNum },
        { abbr: homeAbbr, score: homeScore, leading: hNum > aNum },
      ],
      awayOdds: deterministicOdds(strHash(awayAbbr + ev.id)),
      homeOdds: deterministicOdds(strHash(homeAbbr + ev.id)),
    };
  });
}

const FALLBACK = {
  Tennis: [
    { id: 't1', sport: 'Tennis', period: '● Set 2', isLive: true,  teams: [{ abbr: 'DJO', score: '6', leading: true  }, { abbr: 'ALC', score: '4', leading: false }], awayOdds: '-155', homeOdds: '+130' },
    { id: 't2', sport: 'Tennis', period: 'Final',   isLive: false, teams: [{ abbr: 'SIN', score: '3', leading: false }, { abbr: 'MED', score: '3', leading: false }], awayOdds: '+110', homeOdds: '-125' },
  ],
  Boxing: [
    { id: 'b1', sport: 'Boxing', period: '● Rd 8',  isLive: true,  teams: [{ abbr: 'FUR', score: '—', leading: false }, { abbr: 'USY', score: '—', leading: false }], awayOdds: '+240', homeOdds: '-285' },
  ],
};

export default function HomeScreen({ promoCash, bosOdds, gameTime, navigate, betSlip, onAddBet }) {
  const insets = useSafeAreaInsets();
  const [activeSport, setActiveSport] = useState('NBA');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slipOpen, setSlipOpen] = useState(false);
  const slipAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => { fetchGames(activeSport); }, [activeSport]);

  const openSlip = () => {
    setSlipOpen(true);
    Animated.spring(slipAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 20 }).start();
  };
  const closeSlip = () => {
    Animated.timing(slipAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setSlipOpen(false));
  };

  const liveCount = games.filter(g => g.isLive).length;
  const isParlay  = betSlip.length >= 2;

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
            <Text style={s.liveTitle}>Live {activeSport}</Text>
            {liveCount > 0 && <Text style={s.liveCount}>{liveCount}</Text>}
          </View>
          <Text style={s.seeAll}>See all →</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={C.cyan} style={{ marginTop: 40 }} />
        ) : games.length === 0 ? (
          <View style={s.emptyBox}><Text style={s.emptyTxt}>No live events right now</Text></View>
        ) : (
          <View style={s.grid}>
            {games.map((game, idx) => (
              <GameCard key={game.id} game={game} featured={idx === 0} betSlip={betSlip} onAddBet={onAddBet} />
            ))}
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Bet slip bar — above ticker */}
      {betSlip.length > 0 && (
        <TouchableOpacity style={[s.slipBar, isParlay && s.slipBarParlay]} onPress={openSlip} activeOpacity={0.85}>
          <View style={s.slipLeft}>
            <View style={[s.slipBadge, isParlay && s.slipBadgeParlay]}>
              <Text style={s.slipCount}>{betSlip.length}</Text>
            </View>
            <Text style={s.slipLabel}>{isParlay ? 'PARLAY' : 'STRAIGHT BET'}</Text>
          </View>
          <Text style={s.slipCta}>VIEW SLIP ↑</Text>
        </TouchableOpacity>
      )}

      <Ticker bosTime={gameTime} />
      <BottomNav current="home" navigate={navigate} />

      {/* Bet Slip Modal */}
      <Modal visible={slipOpen} transparent animationType="none" onRequestClose={closeSlip}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={closeSlip}>
          <Animated.View
            style={[s.sheet, { transform: [{ translateY: slipAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={s.sheetHandle} />
            <View style={s.sheetHead}>
              <View style={s.sheetHeadLeft}>
                <Text style={s.sheetTitle}>BET SLIP</Text>
                <View style={[s.typeBadge, isParlay && s.typeBadgeParlay]}>
                  <Text style={[s.typeTxt, isParlay && s.typeTxtParlay]}>{isParlay ? 'PARLAY' : 'STRAIGHT'}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={closeSlip} style={{ padding: 4 }}>
                <Text style={s.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            {betSlip.map(bet => (
              <View key={bet.id} style={s.slipRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.slipBetTeam}>{bet.teamAbbr} Moneyline</Text>
                  <Text style={s.slipBetMeta}>{bet.sport} · vs {bet.opponent}</Text>
                </View>
                <Text style={s.slipBetOdds}>{bet.odds}</Text>
                <TouchableOpacity style={s.slipX} onPress={() => onAddBet(bet)}>
                  <Text style={s.slipXTxt}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {isParlay && (
              <View style={s.parlayNote}>
                <Text style={s.parlayNoteTxt}>Parlay · {betSlip.length} legs combined</Text>
              </View>
            )}

            <LinearGradient colors={['#00c0c8', '#0050ff']} style={s.placeBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <TouchableOpacity style={s.placeBtnInner} activeOpacity={0.85}>
                <Text style={s.placeBtnTxt}>PLACE {isParlay ? 'PARLAY' : 'BET'}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function GameCard({ game, featured, betSlip, onAddBet }) {
  const handleTeamPress = (teamIdx) => {
    const team     = game.teams[teamIdx];
    const opponent = game.teams[1 - teamIdx];
    const odds     = teamIdx === 0 ? game.awayOdds : game.homeOdds;
    onAddBet({
      id:       `${game.id}-${team.abbr}`,
      gameId:   game.id,
      teamAbbr: team.abbr,
      opponent: opponent.abbr,
      odds,
      sport:    game.sport,
    });
  };

  const anyInSlip = betSlip.some(b => b.gameId === game.id);

  return (
    <View style={[s.card, featured && s.cardFeatured, anyInSlip && s.cardActive]}>
      <View style={s.cardHead}>
        <Text style={[s.cardPeriod, game.isLive && { color: C.red }]}>{game.period}</Text>
        <Text style={s.cardSport}>{game.sport}</Text>
      </View>
      {game.teams.map((t, i) => {
        const odds = i === 0 ? game.awayOdds : game.homeOdds;
        const sel  = betSlip.some(b => b.id === `${game.id}-${t.abbr}`);
        return (
          <TouchableOpacity
            key={t.abbr}
            style={[s.teamRow, i === 0 && { marginBottom: 5 }]}
            onPress={() => handleTeamPress(i)}
            activeOpacity={0.7}
          >
            <Text style={[s.teamAbbr, t.leading && s.teamAbbrLead, featured && t.leading && s.teamAbbrFeat]}>
              {t.abbr}
            </Text>
            <View style={s.teamRight}>
              <Text style={[s.teamScore, t.leading && s.teamScoreLead, featured && t.leading && s.teamScoreFeat]}>
                {t.score}
              </Text>
              <View style={[s.oddsBtn, sel && s.oddsBtnSel]}>
                <Text style={[s.oddsTxt, sel && s.oddsTxtSel]}>{odds}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
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
  emptyBox:        { alignItems: 'center', paddingVertical: 50 },
  emptyTxt:        { fontFamily: F.mono, fontSize: 12, color: C.dim },

  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 18, paddingBottom: 12 },
  card:            { width: CARD_W, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 12 },
  cardFeatured:    { backgroundColor: C.bgCardGlow, borderColor: C.cyanBorderStrong },
  cardActive:      { borderColor: '#ffb02e', backgroundColor: 'rgba(255,176,46,0.04)' },
  cardHead:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardPeriod:      { fontFamily: F.mono, fontSize: 8, color: C.dim, letterSpacing: 0.8 },
  cardSport:       { fontFamily: F.mono, fontSize: 8, color: C.dim },
  teamRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamAbbr:        { fontFamily: F.raj, fontSize: 12, color: C.muted },
  teamAbbrLead:    { color: C.white },
  teamAbbrFeat:    { color: C.cyan },
  teamRight:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  teamScore:       { fontFamily: F.monoBd, fontSize: 13, color: C.muted },
  teamScoreLead:   { color: C.white },
  teamScoreFeat:   { color: C.cyan, textShadowColor: 'rgba(0,240,245,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  oddsBtn:         { paddingVertical: 3, paddingHorizontal: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 5 },
  oddsBtnSel:      { backgroundColor: 'rgba(0,240,245,0.18)', borderColor: C.cyan },
  oddsTxt:         { fontFamily: F.monoBd, fontSize: 9, color: C.white },
  oddsTxtSel:      { color: C.cyan },

  slipBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10, backgroundColor: 'rgba(0,240,245,0.06)', borderTopWidth: 1, borderTopColor: 'rgba(0,240,245,0.18)' },
  slipBarParlay:   { backgroundColor: 'rgba(123,92,255,0.08)', borderTopColor: 'rgba(123,92,255,0.3)' },
  slipLeft:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slipBadge:       { width: 22, height: 22, borderRadius: 11, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
  slipBadgeParlay: { backgroundColor: '#7b5cff' },
  slipCount:       { fontFamily: F.monoBd, fontSize: 11, color: '#030310' },
  slipLabel:       { fontFamily: F.raj, fontSize: 14, letterSpacing: 1, color: C.white },
  slipCta:         { fontFamily: F.mono, fontSize: 10, color: C.cyan },

  overlay:         { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  sheet:           { backgroundColor: '#09091c', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 40, borderTopWidth: 1, borderColor: 'rgba(0,240,245,0.15)' },
  sheetHandle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 16 },
  sheetHead:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetHeadLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetTitle:      { fontFamily: F.raj, fontSize: 17, letterSpacing: 1.2, color: C.white },
  typeBadge:       { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 5 },
  typeBadgeParlay: { backgroundColor: 'rgba(123,92,255,0.15)', borderColor: 'rgba(123,92,255,0.4)' },
  typeTxt:         { fontFamily: F.monoBd, fontSize: 9, color: C.dim, letterSpacing: 0.6 },
  typeTxtParlay:   { color: '#a78bff' },
  closeX:          { fontFamily: F.grotesk, fontSize: 16, color: C.dim },
  slipRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', gap: 10 },
  slipBetTeam:     { fontFamily: F.groteskSm, fontSize: 13, color: C.white },
  slipBetMeta:     { fontFamily: F.mono, fontSize: 10, color: C.dim, marginTop: 2 },
  slipBetOdds:     { fontFamily: F.monoBd, fontSize: 14, color: C.cyan },
  slipX:           { padding: 4 },
  slipXTxt:        { fontFamily: F.grotesk, fontSize: 13, color: C.dimmer },
  parlayNote:      { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(123,92,255,0.1)', borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: 'rgba(123,92,255,0.2)' },
  parlayNoteTxt:   { fontFamily: F.mono, fontSize: 11, color: '#a78bff' },
  placeBtn:        { borderRadius: 12, overflow: 'hidden', marginTop: 14 },
  placeBtnInner:   { paddingVertical: 14, alignItems: 'center' },
  placeBtnTxt:     { fontFamily: F.raj, fontSize: 16, letterSpacing: 1, color: 'white' },
});
