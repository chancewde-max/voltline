import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { C, F } from '../constants';

// A single game tile with tappable moneyline odds. Shared by the Live
// browser (grid) and the For You feed (full-width, with a reason tag).
export default function GameCard({ game, featured, betSlip, onAddBet, style, reason, onCardPress }) {
  const locked = game.isFinal;

  const handleTeamPress = (teamIdx) => {
    if (locked) return;
    if (onCardPress) { onCardPress(); return; }
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
    <View style={[s.card, featured && s.cardFeatured, anyInSlip && s.cardActive, locked && s.cardLocked, style]}>
      {reason && (
        <View style={s.reasonRow}>
          <Text style={s.reasonTxt}>{reason}</Text>
        </View>
      )}
      <View style={s.cardHead}>
        <Text style={[s.cardPeriod, game.isLive && { color: C.red }]}>{game.period}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={s.cardSport}>{game.sport}</Text>
          {locked && <Text style={s.lockedBadge}>LOCKED</Text>}
        </View>
      </View>
      {game.teams.map((t, i) => {
        const odds = i === 0 ? game.awayOdds : game.homeOdds;
        const sel  = betSlip.some(b => b.id === `${game.id}-${t.abbr}`);
        return (
          <TouchableOpacity
            key={t.abbr}
            style={[s.teamRow, i === 0 && { marginBottom: 5 }]}
            onPress={() => handleTeamPress(i)}
            activeOpacity={locked ? 1 : 0.7}
            disabled={locked}
          >
            <Text style={[s.teamAbbr, t.leading && s.teamAbbrLead, featured && t.leading && s.teamAbbrFeat, locked && s.dimText]}>
              {t.abbr}
            </Text>
            <View style={s.teamRight}>
              <Text style={[s.teamScore, t.leading && s.teamScoreLead, featured && t.leading && s.teamScoreFeat, locked && s.dimText]}>
                {t.score}
              </Text>
              <View style={[s.oddsBtn, sel && s.oddsBtnSel, locked && s.oddsBtnLocked]}>
                <Text style={[s.oddsTxt, sel && s.oddsTxtSel, locked && s.dimText]}>{locked ? '—' : odds}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  card:            { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 13, padding: 12 },
  cardFeatured:    { backgroundColor: C.bgCardGlow, borderColor: C.cyanBorderStrong },
  cardActive:      { borderColor: '#ffb02e', backgroundColor: 'rgba(255,176,46,0.04)' },
  cardLocked:      { opacity: 0.6 },
  reasonRow:       { marginBottom: 8 },
  reasonTxt:       { fontFamily: F.groteskSm, fontSize: 9, color: C.cyan, textTransform: 'uppercase', letterSpacing: 0.8 },
  lockedBadge:     { fontFamily: F.groteskSm, fontSize: 8, color: C.dim, backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 },
  dimText:         { color: C.dim },
  oddsBtnLocked:   { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' },
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
});
