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

import ForYouScreen from './src/screens/ForYouScreen';
import LiveScreen from './src/screens/LiveScreen';
import CasinoScreen from './src/screens/CasinoScreen';
import AccountScreen from './src/screens/AccountScreen';
import BetsScreen from './src/screens/BetsScreen';
import { pad2 } from './src/constants';
import { ESPN_URLS, resolveBetStatus } from './src/bets';

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
  const [placedBets,   setPlacedBets]   = useState([]);
  const placedBetsRef = useRef([]);
  useEffect(() => { placedBetsRef.current = placedBets; }, [placedBets]);

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

  // ── Outcome resolution ──
  const resolvingRef = useRef(false);
  useEffect(() => {
    const resolve = async () => {
      if (resolvingRef.current) return; // skip overlapping runs if a fetch is still in flight
      const pending = placedBetsRef.current.filter(b => b.status === 'pending');
      if (pending.length === 0) return;
      resolvingRef.current = true;

      try {
        const sportsNeeded = [...new Set(pending.flatMap(b => b.legs.map(l => l.sport)))];
        const sportEvents = {};
        await Promise.all(sportsNeeded.map(async sport => {
          const url = ESPN_URLS[sport];
          if (!url) return;
          try {
            const data = await fetch(url).then(r => r.json());
            sportEvents[sport] = data.events || [];
          } catch {}
        }));

        setPlacedBets(prev => prev.map(bet => {
          if (bet.status !== 'pending') return bet;
          const status = resolveBetStatus(bet, sportEvents);
          return status === 'pending' ? bet : { ...bet, status };
        }));
      } finally {
        resolvingRef.current = false;
      }
    };

    resolve();
    const t = setInterval(resolve, 60000);
    return () => clearInterval(t);
  }, []);

  // ── Navigation ──
  // Screens are horizontal layers; navigating slides everything left of the
  // destination off-screen (-W), the destination to 0, and the rest to +W.
  const ORDER = ['home', 'live', 'casino', 'bets', 'account'];
  const layers = useRef(
    ORDER.reduce((acc, key, i) => { acc[key] = new Animated.Value(i === 0 ? 0 : W); return acc; }, {})
  ).current;
  const [screen, setScreen] = useState('home');

  const navigate = (dest) => {
    if (dest === screen || !layers[dest]) return;
    const destIdx = ORDER.indexOf(dest);
    Animated.parallel(ORDER.map((key, i) =>
      Animated.spring(layers[key], {
        toValue: i < destIdx ? -W : i > destIdx ? W : 0,
        useNativeDriver: true, tension: 120, friction: 20,
      })
    )).start();
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

  const placeBet = (amount, payout, combinedOdds) => {
    setPromoCash(p => Math.max(0, p - amount));
    setPlacedBets(prev => [...prev, {
      id:           Date.now().toString(),
      legs:         betSlip,
      stake:        amount,
      payout,
      combinedOdds,
      status:       'pending',
      placedAt:     Date.now(),
    }]);
    setBetSlip([]);
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
        <Animated.View style={[styles.layer, { transform: [{ translateX: layers.home }] }]}>
          <ForYouScreen
            promoCash={promoCash}
            gameTime={gameTime}
            navigate={navigate}
            betSlip={betSlip}
            onAddBet={addBet}
            onPlaceBet={placeBet}
            placedBets={placedBets}
          />
        </Animated.View>

        <Animated.View style={[styles.layer, styles.overlay, { transform: [{ translateX: layers.live }] }]}>
          <LiveScreen
            promoCash={promoCash}
            gameTime={gameTime}
            navigate={navigate}
            betSlip={betSlip}
            onAddBet={addBet}
            onPlaceBet={placeBet}
          />
        </Animated.View>

        <Animated.View style={[styles.layer, styles.overlay, { transform: [{ translateX: layers.casino }] }]}>
          <CasinoScreen navigate={navigate} gameTime={gameTime} />
        </Animated.View>

        <Animated.View style={[styles.layer, styles.overlay, { transform: [{ translateX: layers.bets }] }]}>
          <BetsScreen
            placedBets={placedBets}
            navigate={navigate}
            gameTime={gameTime}
          />
        </Animated.View>

        <Animated.View style={[styles.layer, styles.overlay, { transform: [{ translateX: layers.account }] }]}>
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
