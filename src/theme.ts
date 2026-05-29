export const theme = {
  bg: '#F5F5F7',
  card: '#FFFFFF',
  cardAlt: '#EEF0F5',
  border: '#E5E5EA',
  text: '#111827',
  textDim: '#6B7280',
  primary: '#007AFF',
  accent: '#FF9F0A',
  success: '#34C759',
  danger: '#FF3B30',
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  shadow: {
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4,
  },
  accentPalette: ['#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF9500', '#34C759', '#00C7BE', '#111827'],
  // 默认技能调色板
  palette: ['#007AFF', '#FF9500', '#34C759', '#FF3B30', '#AF52DE', '#FFD60A', '#00C7BE', '#FF2D55'],
  // 三层目标颜色
  levelColor: {
    life: '#FF9500',  // 金色 = 终极
    big: '#007AFF',   // 蓝色 = 大目标
    daily: '#34C759', // 绿色 = 每日
  } as const,
};

export function appAccent(color?: string) {
  return color || theme.primary;
}
