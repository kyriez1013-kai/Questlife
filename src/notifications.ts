// 每个技能独立调度 daily notification.
// identifier 用 `skill-<id>`, 便于精确取消/重排.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Skill } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  return finalStatus === 'granted';
}

function idFor(skillId: string) {
  return `skill-${skillId}`;
}

/** 给一个技能排日提醒. 若该技能没开提醒或缺时间, 仅取消现有 schedule. */
export async function scheduleSkillReminder(skill: Skill): Promise<void> {
  // 先取消旧的, 防止重复
  try {
    await Notifications.cancelScheduledNotificationAsync(idFor(skill.id));
  } catch {
    /* 不存在就忽略 */
  }
  if (!skill.reminderEnabled || skill.reminderHour == null || skill.reminderMinute == null) {
    return;
  }
  const ok = await requestPermission();
  if (!ok) {
    console.warn('[notify] permission denied, skip', skill.name);
    return;
  }
  await Notifications.scheduleNotificationAsync({
    identifier: idFor(skill.id),
    content: {
      title: `${skill.icon ?? '🌱'} ${skill.name}`,
      body: `今天该练 ${skill.dailyTargetMinutes} 分钟啦, 点开打卡 →`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour: skill.reminderHour,
      minute: skill.reminderMinute,
      repeats: true,
    } as any,
  });
}

/** 取消某个技能的提醒 (删除技能时调用) */
export async function cancelSkillReminder(skillId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(idFor(skillId));
  } catch {
    /* ignore */
  }
}

/** App 启动后调一次, 把所有开启提醒的技能重新排好 (防止 OS 清掉) */
export async function rescheduleAllReminders(skills: Skill[]): Promise<void> {
  for (const s of skills) {
    if (s.reminderEnabled) {
      await scheduleSkillReminder(s);
    }
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
