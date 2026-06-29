import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, money } from '../constants';
import BottomNav from '../components/BottomNav';
import { GemIcon, SmallGemIcon, SearchIcon, InfoCircleIcon, CheckCircleIcon, GearIcon } from '../icons';

const PACKS = [
  { id: 'p1', gems: 100,  price: 4.99,  popular: false },
  { id: 'p2', gems: 250,  price: 9.99,  popular: true  },
  { id: 'p3', gems: 600,  price: 19.99, popular: false },
  { id: 'p4', gems: 1500, price: 49.99, popular: false },
];

const STATUS_CFG = {
  online:  { color: C.green,  text: 'Online' },
  betting: { color: C.cyan,   text: 'Live betting' },
  offline: { color: C.dimmer, text: 'Offline' },
  pending: { color: '#ffb02e', text: 'Request sent' },
};

const AVATAR_COLORS = [
  ['#00e676', '#00c0c8'],
  ['#ff6a3d', '#ff2952'],
  ['#7b5cff', '#0050ff'],
];

export default function AccountScreen({ wins, losses, promoCash, gems, navigate, onBuy, onAddFriend, friends, selectedPack, onSelectPack }) {
  const insets     = useSafeAreaInsets();
  const [input, setInput] = useState('');
  const toastAnim  = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState('');

  const total   = wins + losses;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const showToast = (msg) => {
    setToastMsg(msg);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1300),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const handleBuy = () => {
    const pack = PACKS.find(p => p.id === selectedPack);
    if (!pack) return;
    onBuy(pack);
    showToast(`+${pack.gems} gems · ${money(pack.price)} promo cash added`);
  };

  const handleAdd = () => {
    const raw = input.trim().replace(/^@/, '');
    if (!raw) return;
    onAddFriend(raw);
    setInput('');
  };

  const sel = PACKS.find(p => p.id === selectedPack);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Account</Text>
        <View style={s.gearBtn}>
          <GearIcon />
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile */}
        <View style={s.profile}>
          <LinearGradient colors={['#00c0c8', '#0050ff']} style={s.profileAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={s.profileInitials}>JD</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>Jordan Diaz</Text>
            <View style={s.profileRow}>
              <Text style={s.profileHandle}>@jdiaz</Text>
              <View style={s.vipBadge}><Text style={s.vipText}>VIP · TIER 3</Text></View>
            </View>
          </View>
        </View>

        {/* ── RECORD ── */}
        <View style={s.section}>
          <View style={s.secHead}>
            <Text style={s.secTitle}>Record</Text>
            <Text style={s.secMeta}>{total} settled</Text>
          </View>
          <View style={s.statRow}>
            <StatTile label="Wins"     value={wins}        color={C.green} bg={C.greenGlow} border={C.greenBorder} />
            <StatTile label="Losses"   value={losses}      color={C.red}   bg={C.redGlow}   border={C.redBorder} />
            <StatTile label="Win Rate" value={`${winRate}%`} color={C.cyan} bg={C.cyanGlow}  border={C.cyanBorder} />
          </View>
          <View style={s.barBg}>
            <View style={[s.barFill, { width: `${winRate}%` }]} />
          </View>
          <View style={s.barFooter}>
            <Text style={s.barEndTxt}>{wins}W</Text>
            <Text style={s.barMidTxt}>Net <Text style={{ color: C.green }}>+$1,284</Text> lifetime</Text>
            <Text style={s.barEndTxt}>{losses}L</Text>
          </View>
        </View>

        {/* ── WALLET ── */}
        <View style={[s.section, { paddingTop: 18 }]}>
          <View style={s.secHead}>
            <Text style={s.secTitle}>Wallet</Text>
          </View>
          <View style={s.balRow}>
            {/* Promo cash */}
            <View style={s.promoCashTile}>
              <Text style={s.tileLabel}>Promotional Cash</Text>
              <Text style={s.promoAmt}>{money(promoCash)}</Text>
            </View>
            {/* Gems */}
            <View style={s.gemsTile}>
              <Text style={s.tileLabel}>Gems</Text>
              <View style={s.gemsRow}>
                <GemIcon />
                <Text style={s.gemsAmt}>{gems.toLocaleString('en-US')}</Text>
              </View>
            </View>
          </View>

          {/* Buy gems header */}
          <View style={s.buyHeader}>
            <Text style={s.buyTitle}>Buy gems</Text>
            <Text style={s.buySubtitle}>Get equal promo cash, free</Text>
          </View>

          {/* Pack grid */}
          <View style={s.packGrid}>
            {PACKS.map(pack => (
              <PackCard
                key={pack.id}
                pack={pack}
                selected={selectedPack === pack.id}
                onPress={() => onSelectPack(pack.id)}
              />
            ))}
          </View>

          {/* Explainer */}
          <View style={s.explainer}>
            <InfoCircleIcon />
            <Text style={s.explainerTxt}>
              Every gem purchase instantly credits{' '}
              <Text style={{ color: C.green, fontFamily: F.groteskSm }}>promotional cash equal to what you paid</Text>
              {' '}— bet with it across the book.
            </Text>
          </View>

          {/* Buy button */}
          <TouchableOpacity onPress={handleBuy} activeOpacity={0.85}>
            <LinearGradient colors={['#00c0c8', '#0050ff']} style={s.buyBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={s.buyBtnLabel}>{sel ? `Buy ${sel.gems} Gems` : 'Select a pack'}</Text>
              {sel && <Text style={s.buyBtnSub}>{money(sel.price)} → +{money(sel.price)} promo</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── FRIENDS ── */}
        <View style={[s.section, { paddingTop: 20, paddingBottom: 8 }]}>
          <View style={s.secHead}>
            <Text style={s.secTitle}>Friends</Text>
            <Text style={s.secMeta}>{friends.length} added</Text>
          </View>

          {/* Add friend input */}
          <View style={s.addRow}>
            <View style={s.inputWrap}>
              <SearchIcon />
              <TextInput
                style={s.input}
                placeholder="Add by @username"
                placeholderTextColor={C.dimmer}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleAdd}
                returnKeyType="done"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.85}>
              <LinearGradient colors={['#00c0c8', '#0050ff']} style={s.addBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={s.addBtnTxt}>ADD</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Friend list */}
          <View style={s.friendList}>
            {friends.map((f, i) => (
              <FriendCard key={f.id} friend={f} avatarColors={AVATAR_COLORS[i % AVATAR_COLORS.length]} />
            ))}
          </View>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Buy toast */}
      <Animated.View
        style={[
          s.toast,
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
            pointerEvents: 'none',
          },
        ]}
      >
        <CheckCircleIcon />
        <Text style={s.toastTxt}>{toastMsg}</Text>
      </Animated.View>

      <BottomNav current="account" navigate={navigate} />
    </View>
  );
}

function StatTile({ label, value, color, bg, border }) {
  return (
    <View style={[s.statTile, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[s.statNum, { color }]}>{value}</Text>
      <Text style={[s.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

function PackCard({ pack, selected, onPress }) {
  return (
    <TouchableOpacity style={[s.packCard, selected && s.packCardSel]} onPress={onPress} activeOpacity={0.8}>
      {pack.popular && <View style={s.popularBadge}><Text style={s.popularTxt}>POPULAR</Text></View>}
      <View style={s.packGemsRow}>
        <SmallGemIcon />
        <Text style={s.packGems}>{pack.gems}</Text>
      </View>
      <View style={s.packPriceRow}>
        <Text style={s.packPrice}>{money(pack.price)}</Text>
        <Text style={s.packPromo}>+{money(pack.price)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function FriendCard({ friend, avatarColors }) {
  const st = STATUS_CFG[friend.status] || STATUS_CFG.offline;
  const pending = friend.status === 'pending';
  return (
    <View style={s.friendCard}>
      <LinearGradient colors={avatarColors} style={s.friendAvatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={s.friendInitials}>{friend.initials}</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={s.friendName}>{friend.name}</Text>
        <View style={s.friendStatus}>
          <View style={[s.statusDot, { backgroundColor: st.color }]} />
          <Text style={s.statusTxt}>{st.text}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[s.wrNum, pending && s.wrNumPending]}>{friend.wr}</Text>
        <Text style={s.wrLabel}>Win rate</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: C.bg },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 },
  title:          { fontFamily: F.raj, fontSize: 20, letterSpacing: 1.5, color: C.white, textTransform: 'uppercase' },
  gearBtn:        { width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  scroll:         { flex: 1 },

  profile:        { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 18, paddingBottom: 16 },
  profileAvatar:  { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  profileInitials:{ fontFamily: F.raj, fontSize: 22, color: 'white' },
  profileName:    { fontFamily: F.raj, fontSize: 19, color: C.white, letterSpacing: 0.4 },
  profileRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  profileHandle:  { fontFamily: F.mono, fontSize: 11, color: C.dim },
  vipBadge:       { paddingHorizontal: 7, paddingVertical: 1, backgroundColor: 'rgba(0,240,245,0.1)', borderWidth: 1, borderColor: 'rgba(0,240,245,0.25)', borderRadius: 4 },
  vipText:        { fontFamily: F.mono, fontSize: 9, color: C.cyan, letterSpacing: 0.6 },

  section:        { paddingHorizontal: 18 },
  secHead:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  secTitle:       { fontFamily: F.raj, fontSize: 13, letterSpacing: 1.5, color: C.white, textTransform: 'uppercase' },
  secMeta:        { fontFamily: F.mono, fontSize: 10, color: C.dimmer },

  statRow:        { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statTile:       { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 10, alignItems: 'center' },
  statNum:        { fontFamily: F.monoBd, fontSize: 24, lineHeight: 24 },
  statLabel:      { fontFamily: F.groteskSm, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginTop: 5 },
  barBg:          { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 6, overflow: 'hidden' },
  barFill:        { height: '100%', backgroundColor: '#00c8b0', borderRadius: 4 },
  barFooter:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barEndTxt:      { fontFamily: F.mono, fontSize: 9, color: C.dimmer },
  barMidTxt:      { fontFamily: F.mono, fontSize: 9, color: C.dim },

  balRow:         { flexDirection: 'row', gap: 8, marginBottom: 12 },
  promoCashTile:  { flex: 1.3, backgroundColor: C.bgCardGlow, borderWidth: 1, borderColor: C.cyanBorderMed, borderRadius: 12, padding: 12 },
  gemsTile:       { flex: 1, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12 },
  tileLabel:      { fontFamily: F.grotesk, fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.8 },
  promoAmt:       { fontFamily: F.monoBd, fontSize: 21, color: C.cyan, marginTop: 3, textShadowColor: 'rgba(0,240,245,0.4)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  gemsRow:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  gemsAmt:        { fontFamily: F.monoBd, fontSize: 21, color: C.white },

  buyHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  buyTitle:       { fontFamily: F.groteskSm, fontSize: 12, color: C.muted },
  buySubtitle:    { fontFamily: F.grotesk, fontSize: 10, color: C.dimmer },

  packGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  packCard:       { width: '48%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 13, backgroundColor: C.bgCard },
  packCardSel:    { backgroundColor: 'rgba(0,240,245,0.1)', borderColor: C.cyan, shadowColor: C.cyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 8 },
  popularBadge:   { position: 'absolute', top: -7, right: 10, paddingHorizontal: 7, paddingVertical: 1, backgroundColor: C.cyan, borderRadius: 4 },
  popularTxt:     { fontFamily: F.monoBd, fontSize: 8, color: '#03060a', letterSpacing: 0.6 },
  packGemsRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
  packGems:       { fontFamily: F.monoBd, fontSize: 16, color: C.white },
  packPriceRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packPrice:      { fontFamily: F.monoBd, fontSize: 12, color: C.muted },
  packPromo:      { fontFamily: F.mono, fontSize: 10, color: C.green },

  explainer:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10, padding: 9, paddingHorizontal: 12, backgroundColor: 'rgba(0,230,118,0.05)', borderWidth: 1, borderColor: C.greenBorder, borderRadius: 10 },
  explainerTxt:   { flex: 1, fontFamily: F.grotesk, fontSize: 10, lineHeight: 15, color: '#7fd8a8' },

  buyBtn:         { marginTop: 10, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buyBtnLabel:    { fontFamily: F.raj, fontSize: 15, letterSpacing: 0.7, color: 'white' },
  buyBtnSub:      { fontFamily: F.groteskSm, fontSize: 11, color: 'rgba(255,255,255,0.85)' },

  addRow:         { flexDirection: 'row', gap: 8, marginBottom: 12 },
  inputWrap:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 12 },
  input:          { flex: 1, fontFamily: F.mono, fontSize: 12, color: C.white, paddingVertical: 11 },
  addBtn:         { borderRadius: 10, overflow: 'hidden' },
  addBtnGrad:     { paddingHorizontal: 16, paddingVertical: 11 },
  addBtnTxt:      { fontFamily: F.raj, fontSize: 14, letterSpacing: 0.6, color: 'white' },

  friendList:     { gap: 8 },
  friendCard:     { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 10, paddingHorizontal: 13 },
  friendAvatar:   { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  friendInitials: { fontFamily: F.raj, fontSize: 14, color: 'white' },
  friendName:     { fontFamily: F.groteskSm, fontSize: 13, color: C.white },
  friendStatus:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot:      { width: 6, height: 6, borderRadius: 3 },
  statusTxt:      { fontFamily: F.mono, fontSize: 10, color: C.dim },
  wrNum:          { fontFamily: F.monoBd, fontSize: 13, color: C.cyan },
  wrNumPending:   { color: C.dimmer },
  wrLabel:        { fontFamily: F.grotesk, fontSize: 8, color: C.dimmer, textTransform: 'uppercase', letterSpacing: 1 },

  toast:          { position: 'absolute', bottom: 90, left: 18, right: 18, backgroundColor: 'transparent', borderRadius: 11, overflow: 'hidden' },
});
