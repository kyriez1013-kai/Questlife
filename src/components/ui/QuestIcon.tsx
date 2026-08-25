import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type QuestIconName =
  | 'activity'
  | 'barChart'
  | 'book'
  | 'brain'
  | 'calendar'
  | 'check'
  | 'chevronLeft'
  | 'chevronRight'
  | 'code'
  | 'dumbbell'
  | 'folder'
  | 'heartPulse'
  | 'home'
  | 'library'
  | 'lock'
  | 'lifeBuoy'
  | 'play'
  | 'plus'
  | 'settings'
  | 'target'
  | 'tree'
  | 'unlock'
  | 'wallet'
  | 'zap';

type Props = {
  name: QuestIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export default function QuestIcon({ name, size = 22, color = '#111827', strokeWidth = 2 }: Props) {
  const common = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' ? (
        <>
          <Path {...common} d="M3 10.5 12 3l9 7.5" />
          <Path {...common} d="M5.5 9.5V21h13V9.5" />
          <Path {...common} d="M9.5 21v-6h5v6" />
        </>
      ) : name === 'activity' ? (
        <Path {...common} d="M3 12h4l2-6 4 12 2-6h6" />
      ) : name === 'target' ? (
        <>
          <Circle {...common} cx="12" cy="12" r="9" />
          <Circle {...common} cx="12" cy="12" r="5" />
          <Circle {...common} cx="12" cy="12" r="1.5" />
        </>
      ) : name === 'tree' ? (
        <>
          <Path {...common} d="M12 3 6 10h4l-5 7h6v4h2v-4h6l-5-7h4L12 3Z" />
        </>
      ) : name === 'calendar' ? (
        <>
          <Rect {...common} x="4" y="5" width="16" height="15" rx="2" />
          <Line {...common} x1="8" y1="3" x2="8" y2="7" />
          <Line {...common} x1="16" y1="3" x2="16" y2="7" />
          <Line {...common} x1="4" y1="10" x2="20" y2="10" />
        </>
      ) : name === 'barChart' ? (
        <>
          <Line {...common} x1="5" y1="19" x2="19" y2="19" />
          <Rect {...common} x="6" y="11" width="3" height="6" rx="1" />
          <Rect {...common} x="11" y="7" width="3" height="10" rx="1" />
          <Rect {...common} x="16" y="4" width="3" height="13" rx="1" />
        </>
      ) : name === 'settings' ? (
        <>
          <Circle {...common} cx="12" cy="12" r="3" />
          <Path {...common} d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7.3 7.3 0 0 0-2-1.2L14.2 3h-4.4l-.4 2.7a7.3 7.3 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7.3 7.3 0 0 0 2 1.2l.4 2.7h4.4l.4-2.7a7.3 7.3 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
        </>
      ) : name === 'lifeBuoy' ? (
        <>
          <Circle {...common} cx="12" cy="12" r="9" />
          <Circle {...common} cx="12" cy="12" r="4" />
          <Line {...common} x1="5.6" y1="5.6" x2="8.8" y2="8.8" />
          <Line {...common} x1="15.2" y1="15.2" x2="18.4" y2="18.4" />
          <Line {...common} x1="18.4" y1="5.6" x2="15.2" y2="8.8" />
          <Line {...common} x1="8.8" y1="15.2" x2="5.6" y2="18.4" />
        </>
      ) : name === 'zap' ? (
        <Path {...common} d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z" />
      ) : name === 'library' ? (
        <>
          <Rect {...common} x="4" y="5" width="4" height="15" rx="1" />
          <Rect {...common} x="10" y="4" width="4" height="16" rx="1" />
          <Path {...common} d="m16 6 3-1 4 14-3 1-4-14Z" />
        </>
      ) : name === 'folder' ? (
        <Path {...common} d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      ) : name === 'dumbbell' ? (
        <>
          <Line {...common} x1="7" y1="12" x2="17" y2="12" />
          <Path {...common} d="M4 9v6M7 8v8M17 8v8M20 9v6" />
        </>
      ) : name === 'code' ? (
        <>
          <Path {...common} d="m8 8-4 4 4 4" />
          <Path {...common} d="m16 8 4 4-4 4" />
          <Path {...common} d="m14 5-4 14" />
        </>
      ) : name === 'book' ? (
        <>
          <Path {...common} d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H7a3 3 0 0 0-3 3V5.5Z" />
          <Path {...common} d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
        </>
      ) : name === 'brain' ? (
        <Path {...common} d="M9 5a3 3 0 0 0-5 2.2A3.5 3.5 0 0 0 4.5 14 3 3 0 0 0 8 19h1V5Zm6 0a3 3 0 0 1 5 2.2 3.5 3.5 0 0 1-.5 6.8A3 3 0 0 1 16 19h-1V5Z" />
      ) : name === 'wallet' ? (
        <>
          <Rect {...common} x="3" y="6" width="18" height="14" rx="2" />
          <Path {...common} d="M16 12h5v5h-5a2.5 2.5 0 0 1 0-5Z" />
          <Circle {...common} cx="17.5" cy="14.5" r=".5" />
        </>
      ) : name === 'heartPulse' ? (
        <Path {...common} d="M20.8 8.6a5.3 5.3 0 0 0-8.1-3.9L12 5.4l-.7-.7a5.3 5.3 0 0 0-8.1 6.8L12 20l3.2-3.1M7 13h3l1.5-3 2 6 1.5-3h3" />
      ) : name === 'play' ? (
        <Path {...common} fill={color} d="M8 5v14l11-7L8 5Z" />
      ) : name === 'check' ? (
        <Polyline {...common} points="20 6 9 17 4 12" />
      ) : name === 'chevronLeft' ? (
        <Polyline {...common} points="15 18 9 12 15 6" />
      ) : name === 'chevronRight' ? (
        <Polyline {...common} points="9 18 15 12 9 6" />
      ) : name === 'lock' ? (
        <>
          <Rect {...common} x="5" y="10" width="14" height="10" rx="2" />
          <Path {...common} d="M8 10V7a4 4 0 0 1 8 0v3" />
        </>
      ) : name === 'unlock' ? (
        <>
          <Rect {...common} x="5" y="10" width="14" height="10" rx="2" />
          <Path {...common} d="M8 10V7a4 4 0 0 1 7.4-2" />
        </>
      ) : name === 'plus' ? (
        <>
          <Line {...common} x1="12" y1="5" x2="12" y2="19" />
          <Line {...common} x1="5" y1="12" x2="19" y2="12" />
        </>
      ) : null}
    </Svg>
  );
}
