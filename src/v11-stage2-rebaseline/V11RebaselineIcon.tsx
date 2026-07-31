import React from 'react';
import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
} from 'react-native-svg';

export type V11RebaselineIconName =
  | 'activity'
  | 'add'
  | 'arrow'
  | 'calendar'
  | 'capture'
  | 'chevron-down'
  | 'chevron-up'
  | 'close'
  | 'code'
  | 'home'
  | 'insights'
  | 'settings'
  | 'target'
  | 'update';

type Props = {
  color: string;
  name: V11RebaselineIconName;
  size?: number;
};

export default function V11RebaselineIcon({
  color,
  name,
  size = 20,
}: Props) {
  const line = {
    fill: 'none',
    stroke: color,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
    strokeWidth: 1.25,
  };

  return (
    <Svg height={size} viewBox="0 0 20 20" width={size}>
      {name === 'home' ? (
        <>
          <Path {...line} d="M3 9.2 10 3l7 6.2" />
          <Path {...line} d="M4.7 8.3V17h10.6V8.3M8.1 17v-5h3.8v5" />
        </>
      ) : null}
      {name === 'target' ? (
        <>
          <Circle {...line} cx="10" cy="10" r="7" />
          <Circle {...line} cx="10" cy="10" r="3.5" />
          <Circle cx="10" cy="10" fill={color} r="1" />
        </>
      ) : null}
      {name === 'calendar' ? (
        <>
          <Rect {...line} height="12.5" rx="1.5" width="14" x="3" y="4.5" />
          <Line {...line} x1="6.5" x2="6.5" y1="2.5" y2="6.5" />
          <Line {...line} x1="13.5" x2="13.5" y1="2.5" y2="6.5" />
          <Line {...line} x1="3" x2="17" y1="8" y2="8" />
        </>
      ) : null}
      {name === 'insights' ? (
        <>
          <Line {...line} x1="3" x2="17" y1="17" y2="17" />
          <Line {...line} x1="5" x2="5" y1="12" y2="15" />
          <Line {...line} x1="10" x2="10" y1="8" y2="15" />
          <Line {...line} x1="15" x2="15" y1="4" y2="15" />
        </>
      ) : null}
      {name === 'settings' ? (
        <>
          <Circle {...line} cx="10" cy="10" r="2.4" />
          <Path {...line} d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4" />
        </>
      ) : null}
      {name === 'capture' ? (
        <>
          <Path {...line} d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3" />
          <Path {...line} d="m6.4 6.4 1.5 1.5M12.1 12.1l1.5 1.5M13.6 6.4l-1.5 1.5M7.9 12.1l-1.5 1.5" />
          <Circle {...line} cx="10" cy="10" r="1.7" />
        </>
      ) : null}
      {name === 'arrow' ? (
        <>
          <Line {...line} x1="4" x2="15.2" y1="15.2" y2="4" />
          <Polyline {...line} points="8.2,4 15.2,4 15.2,11" />
        </>
      ) : null}
      {name === 'add' ? (
        <>
          <Line {...line} x1="10" x2="10" y1="3.5" y2="16.5" />
          <Line {...line} x1="3.5" x2="16.5" y1="10" y2="10" />
        </>
      ) : null}
      {name === 'close' ? (
        <>
          <Line {...line} x1="4.5" x2="15.5" y1="4.5" y2="15.5" />
          <Line {...line} x1="15.5" x2="4.5" y1="4.5" y2="15.5" />
        </>
      ) : null}
      {name === 'chevron-down' ? (
        <Polyline {...line} points="4,7 10,13 16,7" />
      ) : null}
      {name === 'chevron-up' ? (
        <Polyline {...line} points="4,13 10,7 16,13" />
      ) : null}
      {name === 'update' ? (
        <>
          <Line {...line} x1="4" x2="16" y1="5" y2="5" />
          <Line {...line} x1="4" x2="16" y1="10" y2="10" />
          <Line {...line} x1="4" x2="16" y1="15" y2="15" />
          <Circle cx="7" cy="5" fill={color} r="1.5" />
          <Circle cx="13" cy="10" fill={color} r="1.5" />
          <Circle cx="9" cy="15" fill={color} r="1.5" />
        </>
      ) : null}
      {name === 'activity' ? (
        <Polyline {...line} points="2.5,10 6,10 8,5.5 12,14.5 14,10 17.5,10" />
      ) : null}
      {name === 'code' ? (
        <>
          <Polyline {...line} points="7.5,5.5 3,10 7.5,14.5" />
          <Polyline {...line} points="12.5,5.5 17,10 12.5,14.5" />
          <Line {...line} x1="11.5" x2="8.5" y1="3.5" y2="16.5" />
        </>
      ) : null}
    </Svg>
  );
}
