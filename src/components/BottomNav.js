import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavHomeIcon, NavLiveIcon, NavCasinoIcon, NavBetsIcon, NavAccountIcon } from '../icons';
import { C, F } from '../constants';

const TABS = [
  { key: 'home',    label: 'Home',    Icon: NavHomeIcon },
  { key: 'live',    label: 'Live',    Icon: NavLiveIcon },
  { key: 'casino',  label: 'Casino',  Icon: NavCasinoIcon },
  { key: 'bets',    label: 'Bets',    Icon: NavBetsIcon },
  { key: 'account', label: 'Account', Icon: NavAccountIcon },
];

export default function BottomNav({ current, navigate }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {TABS.map(({ key, label, Icon }) => {
        const active = current === key;
        const color = active ? C.cyan : C.dimmer;
        // 'casino' isn't built yet — route it to the For You home for now.
        const dest = key === 'casino' ? 'home' : key;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tab}
            onPress={() => navigate(dest)}
            activeOpacity={0.7}
          >
            <Icon color={color} />
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontFamily: F.grotesk,
    fontSize: 9,
    color: C.dimmer,
  },
  labelActive: {
    fontFamily: F.groteskSm,
    color: C.cyan,
  },
});
