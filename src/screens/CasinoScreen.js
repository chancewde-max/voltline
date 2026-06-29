import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../constants';
import BottomNav from '../components/BottomNav';
import Ticker from '../components/Ticker';

export default function CasinoScreen({ navigate, gameTime }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.brand}>VOLT<Text style={s.brandAccent}>LINE</Text></Text>
        <Text style={s.headerSub}>CASINO</Text>
      </View>

      <View style={s.body}>
        <View style={s.coneRow}>
          <Text style={s.cone}>🚧</Text>
          <Text style={s.cone}>🚧</Text>
          <Text style={s.cone}>🚧</Text>
        </View>
        <Text style={s.title}>UNDER CONSTRUCTION</Text>
        <Text style={s.sub}>Casino games are coming soon.{'\n'}Check back for slots, blackjack, and more.</Text>
        <View style={s.badge}>
          <Text style={s.badgeTxt}>COMING SOON</Text>
        </View>
      </View>

      <Ticker bosTime={gameTime} />
      <BottomNav current="casino" navigate={navigate} />
    </View>
  );
}

const s = StyleSheet.create({
  screen:    { flex: 1, backgroundColor: C.bg },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  brand:     { fontFamily: F.raj, fontSize: 22, color: C.white, letterSpacing: 2 },
  brandAccent: { color: C.cyan },
  headerSub: { fontFamily: F.groteskSm, fontSize: 13, color: C.dim, letterSpacing: 1 },

  body:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  coneRow:   { flexDirection: 'row', gap: 12, marginBottom: 24 },
  cone:      { fontSize: 36 },
  title:     { fontFamily: F.raj, fontSize: 28, letterSpacing: 3, color: C.white, textAlign: 'center', marginBottom: 14 },
  sub:       { fontFamily: F.grotesk, fontSize: 14, color: C.dim, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  badge:     { backgroundColor: 'rgba(255,176,46,0.1)', borderWidth: 1, borderColor: 'rgba(255,176,46,0.3)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 6 },
  badgeTxt:  { fontFamily: F.monoBd, fontSize: 12, color: '#ffb02e', letterSpacing: 1.5 },
});
