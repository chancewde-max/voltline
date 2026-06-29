import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import BetsScreen from './src/screens/BetsScreen';
import { pad2 } from './src/constants';

const W = Dimensions.get('window').width;

const SPORT_ESPN_URLS = {
  NBA:         'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  NFL:         'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  Soccer:      'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard',
  NHL:         'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  UFC:         'https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard',
  'World Cup': 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
};

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
  const bosOdds  = '+125';

  // ── Outcome resolution ──
  useEffect(() => {
    const resolve = async () => {
      const pending = placedBetsRef.current.filter(b => b.status === 'pending');
      if (pending.length === 0) return;

      const sportsNeeded = [...new Set(pending.flatMap(b => b.legs.map(l => l.sport)))];
      const sportEvents = {};
      await Promise.all(sportsNeeded.map(async sport => {
        const url = SPORT_ESPN_URLS[sport];
        if (!url) return;
        try {
          const data = await fetch(url).then(r => r.json());
          sportEvents[sport] = data.events || [];
        } catch {}
      }));

      setPlacedBets(prev => prev.map(bet => {
        if (bet.status !== 'pending') return bet;

        const legResults = bet.legs.map(leg => {
          const events = sportEvents[leg.sport] || [];
          const ev = events.find(e => e.id === leg.gameId);
          if (!ev) return null;
          if (ev.status?.type?.description !== 'Final') return null;

          const comps = ev.competitions?.[0]?.competitors || [];
          const sorted = [...comps].sort((a, b) => parseInt(b.score || 0) - parseInt(a.score || 0));
          const wonAbbr = sorted[0]?.team?.abbreviation;
          return wonAbbr === leg.teamAbbr ? 'won' : 'lost';
        });

        if (legResults.some(r => r === null)) return bet;
        const anyLost = legResults.some(r => r === 'lost');
        return { ...bet, status: anyLost ? 'lost' : 'won' };
      }));
    };

    resolve();
    const t = setInterval(resolve, 60000);
    return () => clearInterval(t);
  }, []);

  // ── Navigation ──
  const homeX    = useRef(new Animated.Value(0)).current;
  const betsX    = useRef(new Animated.Value(W)).current;
  const accountX = useRef(new Animated.Value(W)).current;
  const [screen, setScreen] = useState('home');

  const navigate = (dest) => {
    if (dest === screen) return;
    const positions = {
      home:    { home: 0,    bets: W,    account: W  },
      bets:    { home: -W,   bets: 0,    account: W  },
      account: { home: -W,   bets: -W,   account: 0  },
    };
    const pos = positions[dest] || positions.home;
    Animated.parallel([
      Animated.spring(homeX,    { toValue: pos.home,    useNativeDriver: true, tension: 120, friction: 20 }),
      Animated.spring(betsX,    { toValue: pos.bets,    useNativeDriver: true, tension: 120, friction: 20 }),
      Animated.spring(accountX, { toValue: pos.account, useNativeDriver: true, tension: 120, friction: 20 }),
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
        <Animated.View style={[styles.layer, { transform: [{ translateX: homeX }] }]}>
          <HomeScreen
            promoCash={promoCash}
            bosOdds={bosOdds}
            gameTime={gameTime}
            navigate={navigate}
            betSlip={betSlip}
            onAddBet={addBet}
            onPlaceBet={placeBet}
          />
        </Animated.View>

        <Animated.View style={[styles.layer, styles.overlay, { transform: [{ translateX: betsX }] }]}>
          <BetsScreen
            placedBets={placedBets}
            navigate={navigate}
            gameTime={gameTime}
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
