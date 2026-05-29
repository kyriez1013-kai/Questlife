// TimePickerInput - 原生实现 (iOS & Android)
// 用 @react-native-community/datetimepicker.
//   iOS:     display="spinner" — 始终内联渲染滚轮
//   Android: 默认 dialog — 点按钮触发系统时间对话框
//
// Metro 会在原生平台优先选用 .native.tsx; web 用同名 .tsx (走 HTML input).
import React, { useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { theme } from '../theme';

export interface TimePickerInputProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

export default function TimePickerInput({ hour, minute, onChange }: TimePickerInputProps) {
  // Android 用临时 state 控制 dialog 显隐 (iOS 不用, 但 hook 必须无条件调用)
  const [androidShow, setAndroidShow] = useState(false);

  // 构造一个 Date, 只取 hour/minute, 日期部分无意义
  const date = new Date();
  date.setHours(hour);
  date.setMinutes(minute);
  date.setSeconds(0);
  date.setMilliseconds(0);

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.iosWrap}>
        <DateTimePicker
          value={date}
          mode="time"
          display="spinner"
          // 深色 UI
          themeVariant="dark"
          textColor={theme.text}
          onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
            if (selectedDate) {
              onChange(selectedDate.getHours(), selectedDate.getMinutes());
            }
          }}
          style={styles.iosSpinner}
        />
      </View>
    );
  }

  // Android: 显示一个按钮; 点了打开系统时间对话框
  return (
    <View>
      <TouchableOpacity onPress={() => setAndroidShow(true)} style={styles.androidBtn}>
        <Text style={styles.androidText}>
          ⏰ {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
        </Text>
        <Text style={styles.androidHint}>点击修改</Text>
      </TouchableOpacity>
      {androidShow && (
        <DateTimePicker
          value={date}
          mode="time"
          display="default"
          is24Hour
          onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
            setAndroidShow(false);
            // event.type 在用户确定时为 'set', 取消时为 'dismissed'
            if (event.type === 'set' && selectedDate) {
              onChange(selectedDate.getHours(), selectedDate.getMinutes());
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iosWrap: {
    backgroundColor: theme.card,
    borderRadius: 12,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  iosSpinner: {
    // iOS spinner 高度由系统决定, 一般 ~200pt; 给个最小高度
    height: 180,
  },
  androidBtn: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  androidText: { color: theme.text, fontSize: 20, fontWeight: '700' },
  androidHint: { color: theme.textDim, fontSize: 12 },
});
