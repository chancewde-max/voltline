import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { C, F } from '../constants';

const BASE_ITEMS = [
  { prefix: '● ', suffix: '', color: C.cyan, live: true },
  { text: 'GSW 89 – MIL 94 Q3 5:12', color: C.dim },
  { text: 'MIA 76 – NYK 81 H2 3:22', color: C.dim },
  { text: 'KC 24 – SF 17 3Q 8:45',   color: C.dim },
  { text: "MCI 1 – ARS 2 72'",        color: C.dim },
  { text: 'PHX 98 – DAL 101 Q4 1:54', color: C.green },
];

export default function Ticker({ bosTime }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const animRef    = useRef(null);
  const [halfW, setHalfW]   = useState(0);

  const startAnim = (hw) => {
    if (animRef.current) animRef.current.stop();
    translateX.setValue(0);
    animRef.current = Animated.loop(
      Animated.timing(translateX, {
        toValue: -hw,
        duration: 22000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animRef.current.start();
  };

  const onLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== halfW * 2) {
      const hw = w / 2;
      setHalfW(hw);
      startAnim(hw);
    }
  };

  useEffect(() => () => { if (animRef.current) animRef.current.stop(); }, []);

  // Doubled items for seamless loop
  const items = [...BASE_ITEMS, ...BASE_ITEMS];

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.track, { transform: [{ translateX }] }]}
        onLayout={onLayout}
      >
        {items.map((item, i) => {
          const baseIdx = i % BASE_ITEMS.length;
          const text = item.live
            ? `${item.prefix}LAL 108 – BOS 112 ${bosTime}`
            : item.text;
          return (
            <Text key={i} style={[styles.item, { color: item.color }]}>
              {text}{'   '}
            </Text>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 27,
    backgroundColor: 'rgba(0,0,8,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,240,245,0.2)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    fontFamily: F.mono,
    fontSize: 9,
    paddingHorizontal: 16,
  },
});
