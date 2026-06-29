import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Rajdhani_700Bold } from '@expo-google-fonts/rajdhani';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';

import HomeScreen from './src/screens/HomeScreen';
import AccountScreen from './src/screens/AccountScreen';
import { pad2 } from './src/constants';

const W = Dimensions.get('window').width;

const INITIAL_FRIENDS = [
  { id: 'f1', name: 'Marcus Tan',  initials: 'MT', status: 'online',  wr: '68%' },
  { id: 'f2', name: 'Sara Klein',  initials: 'SK', status: 'betting', wr: '54%' },
  { id: 'f3', name: 'Devin Royce', initials: 'DR', status: 'offline', wr: '71%' },
];

export default function App() {
  const [fontsLoaded] = useFonts({
    Rajdhani_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  // ── App state ──
  const [wins,         setWins]         = useState(142);
  const [losses,       setLosses]       = useState(89);
  const [promoCash,    setPromoCash]    = useState(3240.50);
  const [gems,         setGems]         = useState(1250);
  const [selectedPack, setSelectedPack] = useState('p2');
  const [friends,      setFriends]      = useState(INITIAL_FRIENDS);
  const [betSlip,      setBetSlip]      = useState([]);

  // ── Live clock ──
  const [min, setMin] = useState(2);
  const [sec, setSec] = useState(34);
  useEffect(() => {
    const t = setInterval(() => {
      setSec(s => {
        if (s > 0) return s - 1;
        setMin(m => (m > 0 ? m - 1 : 0));
        return 59;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const gameTime = `Q4 ${min}:${pad2(sec)}`;
  const bosOdds  = '+125';

  // ── Navigation ──
  const homeX    = useRef(new Animated.Value(0)).current;
  const accountX = useRef(new Animated.Value(W)).current;
  const [screen, setScreen] = useState('home');

  const navigate = (dest) => {
    if (dest === screen) return;
    const toAccount = dest === 'account';
    Animated.parallel([
      Animated.spring(homeX,    { toValue: toAccount ? -W : 0, useNativeDriver: true, tension: 120, friction: 20 }),
      Animated.spring(accountX, { toValue: toAccount ?  0 : W, useNativeDriver: true, tension: 120, friction: 20 }),
    ]).start();
    setScreen(dest);
  };

  // ── Handlers ──
  const handleBuy = (pack) => {
    setGems(g => g + pack.gems);
    setPromoCash(p => p + pack.price);
  };

  const addBet = (bet) => {
    setBetSlip(prev => {
      const exists = prev.find(b => b.id === bet.id);
      return exists ? prev.filter(b => b.id !== bet.id) : [...prev, bet];
    });
  };

  const handleAddFriend = (raw) => {
    const name     = raw.charAt(0).toUpperCase() + raw.slice(1);
    const initials = name.slice(0, 2).toUpperCase();
    setFriends(prev => [
      { id: 'f' + Date.now(), name, initials, status: 'pending', wr: '—' },
      ...prev,
    ]);
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        <Animated.View style={[styles.layer, { transform: [{ translateX: homeX }] }]}>
          <HomeScreen
            promoCash={promoCash}
            bosOdds={bosOdds}
            gameTime={gameTime}
            navigate={navigate}
            betSlip={betSlip}
            onAddBet={addBet}
          />
        </Animated.View>

        <Animated.View style={[styles.layer, styles.overlay, { transform: [{ translateX: accountX }] }]}>
          <AccountScreen
            wins={wins}
            losses={losses}
            promoCash={promoCash}
            gems={gems}
            selectedPack={selectedPack}
            onSelectPack={setSelectedPack}
            onBuy={handleBuy}
            friends={friends}
            onAddFriend={handleAddFriend}
            navigate={navigate}
          />
        </Animated.View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#030310', overflow: 'hidden' },
  layer:   { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
});
