import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, money } from '../constants';
import { calcCombinedOdds, calcPayout } from '../bets';

// Shared bet slip: a docked summary bar + a slide-up detail/stake sheet.
// Rendered by any screen that lets the user add bets (Live browser, For You).
export default function BetSlip({ betSlip, onAddBet, onPlaceBet, promoCash }) {
  const [slipOpen, setSlipOpen] = useState(false);
  const [stake, setStake] = useState('');
  const slipAnim = useRef(new Animated.Value(0)).current;

  const stakeNum     = parseFloat(stake) || 0;
  const payout       = calcPayout(stakeNum, betSlip);
  const canPlace     = stakeNum > 0 && stakeNum <= promoCash;
  const combinedOdds = calcCombinedOdds(betSlip);
  const isParlay     = betSlip.length >= 2;

  const openSlip = () => {
    setSlipOpen(true);
    Animated.spring(slipAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 20 }).start();
  };
  const closeSlip = () => {
    Animated.timing(slipAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setSlipOpen(false));
  };

  if (betSlip.length === 0) return null;

  return (
    <>
      {/* Docked summary bar */}
      <TouchableOpacity style={[s.slipBar, isParlay && s.slipBarParlay]} onPress={openSlip} activeOpacity={0.85}>
        <View style={s.slipLeft}>
          <View style={[s.slipBadge, isParlay && s.slipBadgeParlay]}>
            <Text style={s.slipCount}>{betSlip.length}</Text>
          </View>
          <Text style={s.slipLabel}>{isParlay ? 'PARLAY' : 'STRAIGHT BET'}</Text>
        </View>
        <View style={s.slipRight}>
          <Text style={[s.slipOdds, isParlay && s.slipOddsParlay]}>{combinedOdds}</Text>
          <Text style={s.slipCta}>VIEW SLIP ↑</Text>
        </View>
      </TouchableOpacity>

      {/* Detail / stake sheet */}
      <Modal visible={slipOpen} transparent animationType="none" onRequestClose={closeSlip}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                  <Text style={[s.combinedOdds, isParlay && s.combinedOddsParlay]}>{combinedOdds}</Text>
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

              {/* Stake row */}
              <View style={s.stakeRow}>
                <View style={s.stakeWrap}>
                  <Text style={s.stakeDollar}>$</Text>
                  <TextInput
                    style={s.stakeInput}
                    value={stake}
                    onChangeText={setStake}
                    placeholder="0.00"
                    placeholderTextColor={C.dim}
                    keyboardType="decimal-pad"
                    maxLength={9}
                  />
                </View>
                <View style={s.payoutBox}>
                  <Text style={s.payoutLabel}>To Win</Text>
                  <Text style={[s.payoutAmt, canPlace && { color: C.green }]}>
                    {stakeNum > 0 ? money(payout) : '—'}
                  </Text>
                </View>
              </View>
              {stakeNum > promoCash && stakeNum > 0 && (
                <Text style={s.insufficientTxt}>Insufficient funds · Balance: {money(promoCash)}</Text>
              )}

              <LinearGradient
                colors={canPlace ? ['#00c0c8', '#0050ff'] : ['#2a2a3e', '#2a2a3e']}
                style={s.placeBtn}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <TouchableOpacity
                  style={s.placeBtnInner}
                  activeOpacity={canPlace ? 0.85 : 1}
                  onPress={() => {
                    if (!canPlace) return;
                    onPlaceBet(stakeNum, payout, combinedOdds);
                    setStake('');
                    closeSlip();
                  }}
                >
                  <Text style={[s.placeBtnTxt, !canPlace && { color: C.dim }]}>
                    PLACE {isParlay ? 'PARLAY' : 'BET'}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  slipBar:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: 'rgba(0,240,245,0.25)' },
  slipBarParlay:   { borderTopColor: 'rgba(123,92,255,0.4)' },
  slipLeft:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  slipBadge:       { width: 22, height: 22, borderRadius: 11, backgroundColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
  slipBadgeParlay: { backgroundColor: '#7b5cff' },
  slipCount:       { fontFamily: F.monoBd, fontSize: 11, color: '#030310' },
  slipLabel:       { fontFamily: F.raj, fontSize: 14, letterSpacing: 1, color: C.white },
  slipRight:       { alignItems: 'flex-end', gap: 2 },
  slipOdds:        { fontFamily: F.monoBd, fontSize: 14, color: C.cyan },
  slipOddsParlay:  { color: '#a78bff' },
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
  combinedOdds:    { fontFamily: F.monoBd, fontSize: 14, color: C.cyan },
  combinedOddsParlay: { color: '#a78bff' },
  closeX:          { fontFamily: F.grotesk, fontSize: 16, color: C.dim },
  slipRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', gap: 10 },
  slipBetTeam:     { fontFamily: F.groteskSm, fontSize: 13, color: C.white },
  slipBetMeta:     { fontFamily: F.mono, fontSize: 10, color: C.dim, marginTop: 2 },
  slipBetOdds:     { fontFamily: F.monoBd, fontSize: 14, color: C.cyan },
  slipX:           { padding: 4 },
  slipXTxt:        { fontFamily: F.grotesk, fontSize: 13, color: C.dimmer },
  parlayNote:      { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'rgba(123,92,255,0.1)', borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: 'rgba(123,92,255,0.2)' },
  parlayNoteTxt:   { fontFamily: F.mono, fontSize: 11, color: '#a78bff' },
  stakeRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 14 },
  stakeWrap:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 12 },
  stakeDollar:     { fontFamily: F.monoBd, fontSize: 16, color: C.muted },
  stakeInput:      { flex: 1, fontFamily: F.monoBd, fontSize: 18, color: C.white, paddingVertical: 11 },
  payoutBox:       { alignItems: 'flex-end', minWidth: 90 },
  payoutLabel:     { fontFamily: F.grotesk, fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.8 },
  payoutAmt:       { fontFamily: F.monoBd, fontSize: 16, color: C.muted, marginTop: 1 },
  insufficientTxt: { fontFamily: F.mono, fontSize: 10, color: C.red, marginTop: 6 },
  placeBtn:        { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  placeBtnInner:   { paddingVertical: 14, alignItems: 'center' },
  placeBtnTxt:     { fontFamily: F.raj, fontSize: 16, letterSpacing: 1, color: 'white' },
});
