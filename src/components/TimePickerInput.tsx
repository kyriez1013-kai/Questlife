// TimePickerInput - Web 实现
// (Metro 在 web 平台会选这个文件; 在 ios/android 会自动选 .native.tsx)
//
// 用 HTML <input type="time">, Safari/Chrome/Edge 会触发各自系统的时间选择器.
import React from 'react';
import { theme } from '../theme';

export interface TimePickerInputProps {
  hour: number;      // 0-23
  minute: number;    // 0-59
  onChange: (hour: number, minute: number) => void;
}

// 全局 CSS 一次性注入: 深色背景 + 反白 calendar 图标
if (typeof document !== 'undefined' && !document.getElementById('ql-timepicker-css')) {
  const style = document.createElement('style');
  style.id = 'ql-timepicker-css';
  style.innerHTML = `
    input.ql-time-input {
      background: ${theme.card};
      color: ${theme.text};
      border: 1px solid ${theme.border};
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 18px;
      font-weight: 600;
      font-family: inherit;
      width: 160px;
      outline: none;
      color-scheme: dark;
      -webkit-appearance: none;
      appearance: none;
    }
    input.ql-time-input:focus { border-color: ${theme.primary}; }
    input.ql-time-input::-webkit-calendar-picker-indicator {
      filter: invert(0.7);
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

export default function TimePickerInput({ hour, minute, onChange }: TimePickerInputProps) {
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return React.createElement('input', {
    type: 'time',
    className: 'ql-time-input',
    value: `${hh}:${mm}`,
    step: 60, // 仅分钟精度
    onChange: (e: any) => {
      const v: string = e?.target?.value ?? '';
      const [h, m] = v.split(':');
      const nh = parseInt(h, 10);
      const nm = parseInt(m, 10);
      if (!Number.isNaN(nh) && !Number.isNaN(nm)) onChange(nh, nm);
    },
  });
}
