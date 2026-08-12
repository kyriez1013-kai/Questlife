import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type PersonalTerminalIconName =
  | 'add' | 'analyst' | 'bar' | 'calendar' | 'candle' | 'chart' | 'check' | 'close' | 'compare'
  | 'decision' | 'drag' | 'edit' | 'evidence' | 'event' | 'goal' | 'indicator' | 'layout'
  | 'market' | 'open' | 'pin' | 'range' | 'remove' | 'research' | 'reset'
  | 'signal' | 'skill' | 'trend-down' | 'trend-flat' | 'trend-up' | 'watchlist'
  | 'zoom-in' | 'zoom-out';

export default function PersonalTerminalIcon({ color, name, size = 18 }: { color: string; name: PersonalTerminalIconName; size?: number }) {
  const line = { fill: 'none', stroke: color, strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const, strokeWidth: 1.15 };
  return (
    <Svg height={size} viewBox="0 0 20 20" width={size}>
      {name === 'market' ? <><Circle {...line} cx="10" cy="10" r="6.5" /><Path {...line} d="M3.5 10h13M10 3.5c2 2 3 4.2 3 6.5s-1 4.5-3 6.5c-2-2-3-4.2-3-6.5s1-4.5 3-6.5Z" /></> : null}
      {name === 'goal' ? <><Circle {...line} cx="10" cy="10" r="6.5" /><Circle {...line} cx="10" cy="10" r="2.7" /><Line {...line} x1="10" x2="16.5" y1="10" y2="3.5" /></> : null}
      {name === 'skill' ? <><Path {...line} d="M4 15.5V9.7L10 4l6 5.7v5.8" /><Path {...line} d="M7 15.5v-4h6v4" /></> : null}
      {name === 'signal' ? <Polyline {...line} points="2.5,11 5.5,11 7.6,6 11,14 13.3,9 17.5,9" /> : null}
      {name === 'evidence' ? <><Rect {...line} height="13" width="11" x="4.5" y="3.5" /><Line {...line} x1="7" x2="13" y1="7" y2="7" /><Line {...line} x1="7" x2="13" y1="10" y2="10" /><Line {...line} x1="7" x2="11" y1="13" y2="13" /></> : null}
      {name === 'event' ? <><Line {...line} x1="3" x2="17" y1="10" y2="10" /><Line {...line} x1="10" x2="10" y1="3" y2="17" /><Rect {...line} height="4" width="4" x="8" y="8" /></> : null}
      {name === 'indicator' ? <><Line {...line} x1="4" x2="16" y1="5" y2="5" /><Line {...line} x1="4" x2="16" y1="10" y2="10" /><Line {...line} x1="4" x2="16" y1="15" y2="15" /><Rect {...line} height="3" width="3" x="6" y="3.5" /><Rect {...line} height="3" width="3" x="11" y="8.5" /><Rect {...line} height="3" width="3" x="8" y="13.5" /></> : null}
      {name === 'research' ? <><Path {...line} d="M7 3.5h6M8 3.5v4l-3.5 6.8c-.5 1 .2 2.2 1.4 2.2h8.2c1.2 0 1.9-1.2 1.4-2.2L12 7.5v-4" /><Line {...line} x1="6.3" x2="13.7" y1="12" y2="12" /></> : null}
      {name === 'analyst' ? <><Circle {...line} cx="8.2" cy="8.2" r="4.3" /><Line {...line} x1="11.3" x2="16.5" y1="11.3" y2="16.5" /><Polyline {...line} points="5.8,9.5 7.4,7.8 9,8.8 10.8,6.5" /></> : null}
      {name === 'decision' ? <><Path {...line} d="M3.5 4.5h5v5h-5zM11.5 10.5h5v5h-5z" /><Path {...line} d="M8.5 7h3v6h-3" /></> : null}
      {name === 'chart' ? <><Line {...line} x1="3" x2="17" y1="16" y2="16" /><Polyline {...line} points="3.5,13 7,9.5 10,11 15.8,4.5" /></> : null}
      {name === 'range' ? <><Line {...line} x1="4" x2="16" y1="10" y2="10" /><Line {...line} x1="4" x2="4" y1="5" y2="15" /><Line {...line} x1="16" x2="16" y1="5" y2="15" /></> : null}
      {name === 'compare' ? <><Polyline {...line} points="3,7 6,4 9,7 12,5 17,8" /><Polyline {...line} points="3,14 6,12 9,13 12,10 17,11" /></> : null}
      {name === 'open' ? <><Line {...line} x1="4" x2="16" y1="10" y2="10" /><Polyline {...line} points="12,6 16,10 12,14" /></> : null}
      {name === 'trend-up' ? <Polyline {...line} points="3,14 8,9 11,11 17,5 17,10" /> : null}
      {name === 'trend-down' ? <Polyline {...line} points="3,6 8,11 11,9 17,15 17,10" /> : null}
      {name === 'trend-flat' ? <><Line {...line} x1="3" x2="17" y1="10" y2="10" /><Polyline {...line} points="13,6 17,10 13,14" /></> : null}
      {name === 'zoom-in' || name === 'zoom-out' ? <><Circle {...line} cx="8.5" cy="8.5" r="4.5" /><Line {...line} x1="11.8" x2="16.5" y1="11.8" y2="16.5" /><Line {...line} x1="6" x2="11" y1="8.5" y2="8.5" />{name === 'zoom-in' ? <Line {...line} x1="8.5" x2="8.5" y1="6" y2="11" /> : null}</> : null}
      {name === 'reset' ? <><Path {...line} d="M5 6.3A6 6 0 1 1 4.5 13" /><Polyline {...line} points="3.5,3.5 5,6.5 8.2,5" /></> : null}
      {name === 'close' ? <><Line {...line} x1="4" x2="16" y1="4" y2="16" /><Line {...line} x1="16" x2="4" y1="4" y2="16" /></> : null}
      {name === 'add' ? <><Line {...line} x1="3.5" x2="16.5" y1="10" y2="10" /><Line {...line} x1="10" x2="10" y1="3.5" y2="16.5" /></> : null}
      {name === 'remove' ? <Line {...line} x1="3.5" x2="16.5" y1="10" y2="10" /> : null}
      {name === 'check' ? <Polyline {...line} points="3.5,10.5 8,15 16.5,5.5" /> : null}
      {name === 'pin' ? <><Path {...line} d="M7 3.5h6l-1 4 2 2v1H6v-1l2-2-1-4Z" /><Line {...line} x1="10" x2="10" y1="10.5" y2="17" /></> : null}
      {name === 'watchlist' ? <><Line {...line} x1="6" x2="16.5" y1="5" y2="5" /><Line {...line} x1="6" x2="16.5" y1="10" y2="10" /><Line {...line} x1="6" x2="16.5" y1="15" y2="15" /><Rect {...line} height="1" width="1" x="3.5" y="4.5" /><Rect {...line} height="1" width="1" x="3.5" y="9.5" /><Rect {...line} height="1" width="1" x="3.5" y="14.5" /></> : null}
      {name === 'edit' ? <><Path {...line} d="M4 14.5 4.7 11 12.8 3l4 4-8.1 8.1-3.7.9Z" /><Line {...line} x1="11.5" x2="15.5" y1="4.5" y2="8.5" /></> : null}
      {name === 'drag' ? <><Circle {...line} cx="7" cy="5" r=".7" /><Circle {...line} cx="13" cy="5" r=".7" /><Circle {...line} cx="7" cy="10" r=".7" /><Circle {...line} cx="13" cy="10" r=".7" /><Circle {...line} cx="7" cy="15" r=".7" /><Circle {...line} cx="13" cy="15" r=".7" /></> : null}
      {name === 'calendar' ? <><Rect {...line} height="12" width="14" x="3" y="4.5" /><Line {...line} x1="3" x2="17" y1="8" y2="8" /><Line {...line} x1="7" x2="7" y1="2.5" y2="6" /><Line {...line} x1="13" x2="13" y1="2.5" y2="6" /></> : null}
      {name === 'layout' ? <><Rect {...line} height="5" width="5" x="3" y="3" /><Rect {...line} height="5" width="7" x="10" y="3" /><Rect {...line} height="7" width="7" x="3" y="10" /><Rect {...line} height="7" width="5" x="12" y="10" /></> : null}
      {name === 'bar' ? <><Rect {...line} height="5" width="2.5" x="3.5" y="11.5" /><Rect {...line} height="9" width="2.5" x="8.75" y="7.5" /><Rect {...line} height="13" width="2.5" x="14" y="3.5" /></> : null}
      {name === 'candle' ? <><Line {...line} x1="6" x2="6" y1="2.5" y2="17.5" /><Rect {...line} height="6" width="4" x="4" y="6" /><Line {...line} x1="14" x2="14" y1="2.5" y2="17.5" /><Rect {...line} height="7" width="4" x="12" y="8" /></> : null}
    </Svg>
  );
}
