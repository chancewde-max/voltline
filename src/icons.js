import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

export function NavHomeIcon({ color = '#3d4e6e', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M3 10L10 3l7 7M5 8.5v8.5h4v-5h2v5h4V8.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

export function NavLiveIcon({ color = '#3d4e6e', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={6.5} stroke={color} strokeWidth={1.5}/>
      <Circle cx={10} cy={10} r={2.5} fill={color}/>
    </Svg>
  );
}

export function NavCasinoIcon({ color = '#3d4e6e', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x={2.5} y={2.5} width={15} height={15} rx={3} stroke={color} strokeWidth={1.5}/>
      <Circle cx={7} cy={7} r={1.3} fill={color}/>
      <Circle cx={13} cy={7} r={1.3} fill={color}/>
      <Circle cx={10} cy={10} r={1.3} fill={color}/>
      <Circle cx={7} cy={13} r={1.3} fill={color}/>
      <Circle cx={13} cy={13} r={1.3} fill={color}/>
    </Svg>
  );
}

export function NavBetsIcon({ color = '#3d4e6e', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Rect x={3.5} y={4} width={13} height={12} rx={2} stroke={color} strokeWidth={1.5}/>
      <Path d="M7 8.5h6M7 12h4" stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
    </Svg>
  );
}

export function NavAccountIcon({ color = '#3d4e6e', size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={7.5} r={3} stroke={color} strokeWidth={1.5}/>
      <Path d="M4.5 17c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
    </Svg>
  );
}

export function GemIcon({ color = '#00f0f5', size = 15 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M4 2h8l3 4-7 8-7-8 3-4z" fill={color} fillOpacity={0.22} stroke={color} strokeWidth={1.1} strokeLinejoin="round"/>
      <Path d="M1 6h14M5.5 2 4 6l4 8 4-8-1.5-4" stroke={color} strokeWidth={0.8} strokeOpacity={0.5}/>
    </Svg>
  );
}

export function SmallGemIcon({ color = '#00f0f5', size = 16 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="M4 2h8l3 4-7 8-7-8 3-4z" fill={color} fillOpacity={0.22} stroke={color} strokeWidth={1.1} strokeLinejoin="round"/>
    </Svg>
  );
}

export function SearchIcon({ size = 14 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Circle cx={6} cy={6} r={4} stroke="#3d4e6e" strokeWidth={1.2}/>
      <Path d="M9 9l3 3" stroke="#3d4e6e" strokeWidth={1.2} strokeLinecap="round"/>
    </Svg>
  );
}

export function InfoCircleIcon({ size = 14 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Circle cx={7} cy={7} r={6} stroke="#00e676" strokeWidth={1.1}/>
      <Path d="M7 6.2v3.4M7 4.3v.1" stroke="#00e676" strokeWidth={1.3} strokeLinecap="round"/>
    </Svg>
  );
}

export function CheckCircleIcon({ size = 16 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Circle cx={8} cy={8} r={7} stroke="white" strokeWidth={1.3}/>
      <Path d="M5 8l2 2 4-4.5" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

export function GearIcon({ size = 15 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 15 15" fill="none">
      <Circle cx={7.5} cy={7.5} r={2.2} stroke="#eef2ff" strokeOpacity={0.55} strokeWidth={1.2}/>
      <Path d="M7.5 1.2v1.8M7.5 12v1.8M1.2 7.5H3M12 7.5h1.8M3.1 3.1l1.3 1.3M10.6 10.6l1.3 1.3M11.9 3.1l-1.3 1.3M4.4 10.6l-1.3 1.3" stroke="#eef2ff" strokeOpacity={0.4} strokeWidth={1.2} strokeLinecap="round"/>
    </Svg>
  );
}

export function SignalIcon() {
  return (
    <Svg width={14} height={10} viewBox="0 0 14 10" fill="none">
      <Rect x={0} y={6} width={2} height={4} fill="#eef2ff" fillOpacity={0.5}/>
      <Rect x={3} y={4} width={2} height={6} fill="#eef2ff" fillOpacity={0.65}/>
      <Rect x={6} y={2} width={2} height={8} fill="#eef2ff" fillOpacity={0.8}/>
      <Rect x={9} y={0} width={2} height={10} fill="#eef2ff"/>
    </Svg>
  );
}

export function BatteryIcon() {
  return (
    <Svg width={22} height={11} viewBox="0 0 22 11" fill="none">
      <Rect x={0.5} y={0.5} width={19} height={10} rx={2.5} stroke="#eef2ff" strokeOpacity={0.35}/>
      <Rect x={20} y={3.5} width={1.5} height={4} rx={0.75} fill="#eef2ff" fillOpacity={0.35}/>
      <Rect x={2} y={2} width={14} height={7} rx={1.5} fill="#eef2ff" fillOpacity={0.9}/>
    </Svg>
  );
}
