import React from 'react';
import QuestIcon, { type QuestIconName } from '../components/ui/QuestIcon';

// Exact supplied prototype paths, not a replacement icon system for legacy/native UI.
const paths = {
  home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3z M1 11l11-9 11 9',
  target: 'M21 11a9 9 0 1 1-8-8 M17 3l-5 9 M17 3v5h5 M16 12a4 4 0 1 1-4-4',
  calendar: 'M5 3v4m14-4v4 M3 10h18 M4 5h16a1 1 0 0 1 1 1v15H3V6a1 1 0 0 1 1-1',
  person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  plus: 'M12 4v16M4 12h16',
  cube: 'm12 2 9 5v10l-9 5-9-5V7z M3 7l9 5 9-5M12 12v10',
  edit: 'm4 16 12-12 4 4L8 20l-5 1z M14 6l4 4',
  book: 'M5 2h9l5 5v15H5z M14 2v6h5 M8 12h8m-8 4h8',
  cloud: 'M6 18h12a5 5 0 0 0 0-10 7 7 0 0 0-13-1 5.5 5.5 0 0 0 1 11',
  heartPulse: 'M12 21 3 12C-3 5 6-1 12 6 18-1 27 5 21 12z',
  shield: 'm12 2 9 4v6c0 5-6 9-9 10-3-1-9-5-9-10V6z M8 12l3 3 5-6',
  bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4',
  settings: 'M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12',
  compare: 'M14 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0 M24 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  nodes: 'm12 4-8 15m9-15 7 15M4 19h16 M14 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M6 20a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M22 20a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  analyst: 'M3 21 12 2l9 19M7 13h10',
};
export type V5IconName = QuestIconName | keyof typeof paths;
export default function PrototypeIcon({ name, size=22, color='currentColor', strokeWidth=1.65 }: {name:V5IconName;size?:number;color?:string;strokeWidth?:number}) {
  if (name === 'barChart') return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="13" width="4" height="9" rx="2" fill="#38c9f3"/><rect x="10" y="7" width="4" height="15" rx="2" fill="#14acfb"/><rect x="18" y="1" width="4" height="21" rx="2" fill="#2275ec"/></svg>;
  if (!(name in paths)) return <QuestIcon name={name as QuestIconName} size={size} color={color} strokeWidth={strokeWidth}/>;
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path d={paths[name as keyof typeof paths]}/></svg>;
}
