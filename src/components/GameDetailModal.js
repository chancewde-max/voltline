import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../constants';
import { strHash, deterministicOdds } from '../bets';

const PROPS_BY_SPORT = {
  NBA:      ['Game Total', 'Points O/U', 'Rebounds O/U', 'Assists O/U', '3-Pointers', '1H Total'],
  NFL:      ['Game Total', 'Passing Yds', 'Rushing Yds', 'Receiving Yds', '1H Total', 'Alt Spread'],
  MLB:      ['Game Total', 'Strikeouts', 'Hits', '1st 5 Inn.', 'Total Bases', 'Run Line'],
  NHL:      ['Game Total', 'Shots O/U', 'Power Plays', '1P Total', 'Alt Line'],
  Soccer:   ['Match Total', '1H Total', 'Both Score', 'Corners O/U', 'Cards O/U'],
  Tennis:   ['Set Total', 'Games O/U', '1st Set', 'Break Sets', 'Ace O/U'],
  Boxing:   ['Round O/U', 'Method', 'Distance Prop', 'KO Prop', 'Decision'],
  UFC:      ['Method', 'Round O/U', 'Distance Prop', 'Sub Prop', 'KO Prop'],
  'World Cup': ['Match Total', '1H Total', 'Both Score', 'Corners O/U', 'Cards O/U'],
};

const BASE_LINES = {
  NBA:      [215.5, 22.5, 8.5, 6.5, 10.5, 108.5],
  NFL:      [45.5, 245.5, 85.5, 65.5, 23.5, 3.5],
  MLB:      [8.5, 6.5, 7.5, 4.5, 9.5, -1.5],
  NHL:      [5.5, 58.5, 3.5, 1.5, 2.5],
  Soccer:   [2.5, 1.5, 0, 9.5, 3.5],
  Tennis:   [2.5, 22.5, 0, 1.5, 8.5],
  Boxing:   [6.5, 0, 0, 0, 0],
  UFC:      [0, 1.5, 0, 0, 0],
  'World Cup': [2.5, 1.5, 0, 9.5, 3.5],
};

function genLine(seed, sport, idx) {
  const base = (BASE_LINES[sport] || [2.5])[idx] ?? 2.5;
  if (base <= 0) return null;
  const offset = ((seed % 10) - 5) * 0.5;
  return parseFloat((base + offset).toFixed(1));
}

const TABS = ['MONEYLINE', 'PROPS', 'SPREADS'];

export default function GameDetailModal({ game, visible, onClose, betSlip, onAddBet }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('PROPS');

  if (!game) return null;

  const props = PROPS_BY_SPORT[game.sport] || ['Match Total', 'Alt Spread', '1H Total'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.container, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
          <Text style={s.closeTxt}>✕</Text>
        </TouchableOpacity>

        {/* Game header */}
        <View style={s.gameHeader}>
          <Text style={[s.period, game.isLive && { color: C.red }]}>{game.period}</Text>
          <Text style={s.sport}>{game.sport}</Text>
          <View style={s.teamsRow}>
            <View style={s.teamCol}>
              <Text style={[s.teamName, game.teams[0].leading && s.teamNameLead]}>{game.teams[0].abbr}</Text>
              <Text style={[s.teamScore, game.teams[0].leading && s.teamScoreLead]}>
                {game.teams[0].score !== '—' ? game.teams[0].score : '—'}
              </Text>
            </View>
            <Text style={s.vs}>vs</Text>
            <View style={[s.teamCol, s.teamColRight]}>
              <Text style={[s.teamName, game.teams[1].leading && s.teamNameLead]}>{game.teams[1].abbr}</Text>
              <Text style={[s.teamScore, game.teams[1].leading && s.teamScoreLead]}>
                {game.teams[1].score !== '—' ? game.teams[1].score : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabTxt, activeTab === tab && s.tabTxtActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
          {activeTab === 'MONEYLINE' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>MONEYLINE</Text>
              {game.teams.map((t, i) => {
                const odds = i === 0 ? game.awayOdds : game.homeOdds;
                const id = `${game.id}-${t.abbr}`;
                const sel = betSlip.some(b => b.id === id);
                return (
                  <TouchableOpacity
                    key={t.abbr}
                    style={[s.propRow, sel && s.propRowSel]}
                    disabled={game.isFinal}
                    onPress={() => !game.isFinal && onAddBet({ id, gameId: game.id, teamAbbr: t.abbr, opponent: game.teams[1 - i].abbr, odds, sport: game.sport })}
                    activeOpacity={0.7}
                  >
                    <Text style={s.propLabel}>{t.abbr} to Win</Text>
                    <Text style={[s.propOdds, sel && s.propOddsSel]}>{game.isFinal ? '—' : odds}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {activeTab === 'PROPS' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>PROPS</Text>
              {props.map((prop, idx) => {
                const seed = strHash(game.id + prop);
                // Game Total uses real odds from API when available
                const isTotal = idx === 0;
                const line    = isTotal && game.totalLine != null ? game.totalLine : genLine(seed, game.sport, idx);
                const overOdds  = isTotal && game.overOdds  ? game.overOdds  : deterministicOdds(seed);
                const underOdds = isTotal && game.underOdds ? game.underOdds : deterministicOdds(strHash(game.id + prop + 'u'));
                const overSel  = betSlip.some(b => b.id === `${game.id}-${prop}-o`);
                const underSel = betSlip.some(b => b.id === `${game.id}-${prop}-u`);
                return (
                  <View key={prop} style={s.propGroup}>
                    <Text style={s.propGroupLabel}>{prop}{line !== null ? ` ${line}` : ''}</Text>
                    <View style={s.propBtns}>
                      <TouchableOpacity
                        style={[s.propBtn, overSel && s.propBtnSel]}
                        disabled={game.isFinal}
                        onPress={() => !game.isFinal && onAddBet({ id: `${game.id}-${prop}-o`, gameId: game.id, teamAbbr: `${prop} Over`, opponent: '', odds: overOdds, sport: game.sport })}
                        activeOpacity={0.7}
                      >
                        <Text style={s.propBtnLabel}>Over</Text>
                        <Text style={[s.propBtnOdds, overSel && s.propBtnOddsSel]}>{game.isFinal ? '—' : overOdds}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.propBtn, underSel && s.propBtnSel]}
                        disabled={game.isFinal}
                        onPress={() => !game.isFinal && onAddBet({ id: `${game.id}-${prop}-u`, gameId: game.id, teamAbbr: `${prop} Under`, opponent: '', odds: underOdds, sport: game.sport })}
                        activeOpacity={0.7}
                      >
                        <Text style={s.propBtnLabel}>Under</Text>
                        <Text style={[s.propBtnOdds, underSel && s.propBtnOddsSel]}>{game.isFinal ? '—' : underOdds}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {activeTab === 'SPREADS' && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>SPREADS</Text>
              {game.teams.map((t, i) => {
                const isAway = i === 0;
                // Use real spread from API when available
                const spreadLine = isAway
                  ? (game.awaySpreadLine ?? (() => { const s2 = strHash(game.id + t.abbr + 'spd'); const v = ((s2 % 14) + 1) + 0.5; return parseInt(game.awayOdds) < 0 ? `-${v}` : `+${v}`; })())
                  : (game.homeSpreadLine ?? (() => { const s2 = strHash(game.id + t.abbr + 'spd'); const v = ((s2 % 14) + 1) + 0.5; return parseInt(game.homeOdds) < 0 ? `-${v}` : `+${v}`; })());
                const spreadOdds = isAway
                  ? (game.awaySpreadOdds ?? deterministicOdds(strHash(game.id + t.abbr + 'spd')))
                  : (game.homeSpreadOdds ?? deterministicOdds(strHash(game.id + t.abbr + 'spd')));
                const spreadId = `${game.id}-${t.abbr}-spd`;
                const sel = betSlip.some(b => b.id === spreadId);
                return (
                  <TouchableOpacity
                    key={t.abbr}
                    style={[s.propRow, sel && s.propRowSel]}
                    disabled={game.isFinal}
                    onPress={() => !game.isFinal && onAddBet({ id: spreadId, gameId: game.id, teamAbbr: t.abbr, opponent: game.teams[1 - i].abbr, odds: spreadOdds, sport: game.sport })}
                    activeOpacity={0.7}
                  >
                    <Text style={s.propLabel}>{t.abbr} {spreadLine}</Text>
                    <Text style={[s.propOdds, sel && s.propOddsSel]}>{game.isFinal ? '—' : spreadOdds}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  closeBtn:       { position: 'absolute', top: 14, right: 18, zIndex: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeTxt:       { fontFamily: F.groteskBd, fontSize: 17, color: C.dim },

  gameHeader:     { alignItems: 'center', paddingTop: 52, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: C.border },
  period:         { fontFamily: F.mono, fontSize: 10, color: C.dim, letterSpacing: 1, marginBottom: 4 },
  sport:          { fontFamily: F.groteskSm, fontSize: 10, color: C.dimmer, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 18 },
  teamsRow:       { flexDirection: 'row', alignItems: 'center', gap: 28 },
  teamCol:        { alignItems: 'center', gap: 6 },
  teamColRight:   {},
  teamName:       { fontFamily: F.raj, fontSize: 30, color: C.muted, letterSpacing: 1 },
  teamNameLead:   { color: C.white },
  teamScore:      { fontFamily: F.monoBd, fontSize: 38, color: C.muted },
  teamScoreLead:  { color: C.cyan, textShadowColor: 'rgba(0,240,245,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  vs:             { fontFamily: F.grotesk, fontSize: 12, color: C.dimmer },

  tabs:           { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.border },
  tab:            { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:      { borderBottomColor: C.cyan },
  tabTxt:         { fontFamily: F.groteskMd, fontSize: 11, color: C.dimmer, letterSpacing: 0.5 },
  tabTxtActive:   { color: C.cyan, fontFamily: F.groteskBd },

  body:           { flex: 1 },
  section:        { padding: 18 },
  sectionTitle:   { fontFamily: F.raj, fontSize: 13, color: C.dim, letterSpacing: 1.5, marginBottom: 14 },

  propRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 10, marginBottom: 8 },
  propRowSel:     { borderColor: C.cyan, backgroundColor: 'rgba(0,240,245,0.06)' },
  propLabel:      { fontFamily: F.groteskMd, fontSize: 13, color: C.white },
  propOdds:       { fontFamily: F.monoBd, fontSize: 13, color: C.white },
  propOddsSel:    { color: C.cyan },

  propGroup:      { marginBottom: 12 },
  propGroupLabel: { fontFamily: F.groteskSm, fontSize: 10, color: C.dim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  propBtns:       { flexDirection: 'row', gap: 8 },
  propBtn:        { flex: 1, paddingVertical: 11, paddingHorizontal: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  propBtnSel:     { borderColor: C.cyan, backgroundColor: 'rgba(0,240,245,0.06)' },
  propBtnLabel:   { fontFamily: F.groteskMd, fontSize: 12, color: C.muted },
  propBtnOdds:    { fontFamily: F.monoBd, fontSize: 12, color: C.white },
  propBtnOddsSel: { color: C.cyan },
});
