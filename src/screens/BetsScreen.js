import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, money } from '../constants';
import { legLabel } from '../bets';
import BottomNav from '../components/BottomNav';
import Ticker from '../components/Ticker';

function StatusBadge({ status }) {
  const cfg = {
    pending: { label: 'PENDING', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
    won:     { label: 'WON',     color: C.green,   bg: C.greenGlow,             border: C.greenBorder },
    lost:    { label: 'LOST',    color: C.red,      bg: C.redGlow,               border: C.redBorder },
    push:    { label: 'PUSH',    color: C.muted,    bg: 'rgba(255,255,255,0.06)', border: C.border },
  }[status] || { label: 'PENDING', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' };

  return (
    <View style={[s.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[s.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function BetCard({ bet }) {
  const isParlay = bet.legs.length >= 2;
  const date = new Date(bet.placedAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.cardTopLeft}>
          <View style={[s.typeBadge, isParlay && s.typeBadgeParlay]}>
            <Text style={[s.typeTxt, isParlay && s.typeTxtParlay]}>
              {isParlay ? `PARLAY · ${bet.legs.length} LEGS` : 'STRAIGHT'}
            </Text>
          </View>
          <Text style={[s.combinedOdds, isParlay && s.combinedOddsParlay]}>{bet.combinedOdds}</Text>
        </View>
        <StatusBadge status={bet.status} />
      </View>

      <View style={s.divider} />

      {bet.legs.map((leg, i) => (
        <View key={i} style={s.legRow}>
          <View style={s.legLeft}>
            <Text style={s.legTeam}>{legLabel(leg)}</Text>
            <Text style={s.legMeta}>{leg.sport} · vs {leg.opponent}</Text>
          </View>
          <Text style={[s.legOdds, parseInt(leg.odds) > 0 ? s.oddsPos : s.oddsNeg]}>{leg.odds}</Text>
        </View>
      ))}

      <View style={s.divider} />

      <View style={s.cardBottom}>
        <View style={s.amtCol}>
          <Text style={s.amtLabel}>Stake</Text>
          <Text style={s.amtVal}>{money(bet.stake)}</Text>
        </View>
        <View style={s.amtColCenter}>
          <Text style={s.amtLabel}>To Win</Text>
          <Text style={[s.amtVal, s.amtWin]}>{money(bet.payout)}</Text>
        </View>
        <View style={[s.amtCol, { alignItems: 'flex-end' }]}>
          <Text style={s.amtLabel}>{dateStr}</Text>
          <Text style={s.amtTime}>{timeStr}</Text>
        </View>
      </View>
    </View>
  );
}

export default function BetsScreen({ placedBets, navigate, gameTime }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.brand}>VOLT<Text style={s.brandAccent}>LINE</Text></Text>
        <Text style={s.headerSub}>MY BETS</Text>
      </View>

      {placedBets.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🎯</Text>
          <Text style={s.emptyTitle}>No bets yet</Text>
          <Text style={s.emptyDesc}>Place your first bet on the Home tab to see it here.</Text>
        </View>
      ) : (
        <ScrollView style={s.list} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
          {[...placedBets].reverse().map(bet => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </ScrollView>
      )}

      <Ticker bosTime={gameTime} />
      <BottomNav current="bets" navigate={navigate} />
    </View>
  );
}

const s = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: C.bg },
  header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  brand:    { fontFamily: F.raj, fontSize: 22, color: C.white, letterSpacing: 2 },
  brandAccent: { color: C.cyan },
  headerSub: { fontFamily: F.groteskSm, fontSize: 13, color: C.dim, letterSpacing: 1 },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontFamily: F.groteskBd, fontSize: 18, color: C.white, marginBottom: 8 },
  emptyDesc:  { fontFamily: F.grotesk, fontSize: 14, color: C.dim, textAlign: 'center', lineHeight: 20 },

  list:     { flex: 1, paddingHorizontal: 16, paddingTop: 12 },

  card:     { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 12 },
  cardTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  typeBadge:       { backgroundColor: 'rgba(0,240,245,0.08)', borderWidth: 1, borderColor: C.cyanBorder, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  typeBadgeParlay: { backgroundColor: 'rgba(167,139,255,0.08)', borderColor: 'rgba(167,139,255,0.25)' },
  typeTxt:         { fontFamily: F.monoBd, fontSize: 10, color: C.cyan },
  typeTxtParlay:   { color: '#a78bff' },

  combinedOdds:       { fontFamily: F.monoBd, fontSize: 15, color: C.cyan },
  combinedOddsParlay: { color: '#a78bff' },

  statusBadge: { borderWidth: 1, borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 },
  statusTxt:   { fontFamily: F.monoBd, fontSize: 10 },

  divider:  { height: 1, backgroundColor: C.border, marginVertical: 10 },

  legRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  legLeft:  { flex: 1, marginRight: 8 },
  legTeam:  { fontFamily: F.groteskSm, fontSize: 13, color: C.white },
  legMeta:  { fontFamily: F.grotesk, fontSize: 11, color: C.dim, marginTop: 1 },
  legOdds:  { fontFamily: F.monoBd, fontSize: 14 },
  oddsPos:  { color: C.green },
  oddsNeg:  { color: C.red },

  cardBottom:    { flexDirection: 'row', alignItems: 'flex-start' },
  amtCol:        { flex: 1 },
  amtColCenter:  { flex: 1, alignItems: 'center' },
  amtLabel:      { fontFamily: F.grotesk, fontSize: 10, color: C.dim, marginBottom: 2 },
  amtVal:        { fontFamily: F.groteskBd, fontSize: 14, color: C.white },
  amtWin:        { color: C.green },
  amtTime:       { fontFamily: F.mono, fontSize: 12, color: C.muted },
});
