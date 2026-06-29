import { Dimensions } from 'react-native';

export const SCREEN_W = Dimensions.get('window').width;

export const C = {
  bg:             '#030310',
  bgCard:         'rgba(10,10,26,1)',
  bgCardGlow:     '#0e1028',
  cyan:           '#00f0f5',
  red:            '#ff2952',
  green:          '#00e676',
  white:          '#eef2ff',
  muted:          '#b0bcd8',
  dim:            '#4a5a7a',
  dimmer:         '#3d4e6e',
  border:         'rgba(255,255,255,0.07)',
  borderWeak:     'rgba(255,255,255,0.06)',
  cyanBorder:     'rgba(0,240,245,0.12)',
  cyanBorderMed:  'rgba(0,240,245,0.22)',
  cyanBorderStrong: 'rgba(0,240,245,0.28)',
  greenBorder:    'rgba(0,230,118,0.16)',
  redBorder:      'rgba(255,41,82,0.18)',
  cyanGlow:       'rgba(0,240,245,0.04)',
  greenGlow:      'rgba(0,230,118,0.06)',
  redGlow:        'rgba(255,41,82,0.06)',
};

export const F = {
  raj:       'Rajdhani_700Bold',
  grotesk:   'SpaceGrotesk_400Regular',
  groteskMd: 'SpaceGrotesk_500Medium',
  groteskSm: 'SpaceGrotesk_600SemiBold',
  groteskBd: 'SpaceGrotesk_700Bold',
  mono:      'SpaceMono_400Regular',
  monoBd:    'SpaceMono_700Bold',
};

export function money(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}
