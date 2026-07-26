import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { QuestTheme } from '../../design/tokens';
import { QuestIconName } from '../ui/QuestIcon';
import QuestEntityIcon from '../ui/QuestEntityIcon';

export type TodayRecentExecutionItem = {
  id: string;
  title: string;
  meta: string;
  detail?: string;
  icon?: string;
  systemIcon?: QuestIconName;
  color?: string;
};

type Props = {
  questTheme: QuestTheme;
  title: string;
  emptyText: string;
  deleteLabel: string;
  moreLabel: string;
  items: TodayRecentExecutionItem[];
  hiddenCount?: number;
  onDelete: (id: string) => void;
};

export default function TodayRecentExecution({
  questTheme,
  title,
  emptyText,
  deleteLabel,
  moreLabel,
  items,
  hiddenCount = 0,
  onDelete,
}: Props) {
  return (
    <View style={{ gap: questTheme.spacing.xs }}>
      <Text
        style={{
          color: questTheme.colors.text,
          fontSize: questTheme.typography.sectionTitleSize,
          lineHeight: questTheme.typography.sectionTitleLineHeight,
          fontWeight: questTheme.typography.weightBold,
        }}
      >
        {title}
      </Text>

      {items.length === 0 ? (
        <View
          style={{
            backgroundColor: questTheme.colors.surfaceSoft,
            borderRadius: questTheme.radius.md,
            padding: questTheme.spacing.md,
          }}
        >
          <Text
            style={{
              color: questTheme.colors.textMuted,
              fontSize: questTheme.typography.bodySize,
              lineHeight: questTheme.typography.bodyLineHeight,
            }}
          >
            {emptyText}
          </Text>
        </View>
      ) : (
        items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.8}
            onLongPress={() => onDelete(item.id)}
            style={{
              minHeight: 58,
              flexDirection: 'row',
              alignItems: 'center',
              gap: questTheme.spacing.sm,
              paddingVertical: questTheme.spacing.sm,
              borderBottomWidth: index < items.length - 1 ? 1 : 0,
              borderBottomColor: questTheme.colors.divider,
            }}
          >
            <QuestEntityIcon
              icon={item.icon}
              systemIcon={item.systemIcon}
              color={item.color}
              questTheme={questTheme}
              size="sm"
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: questTheme.colors.text,
                  fontSize: questTheme.typography.cardTitleSize,
                  lineHeight: questTheme.typography.cardTitleLineHeight,
                  fontWeight: questTheme.typography.weightBold,
                }}
              >
                {item.title}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: questTheme.colors.textMuted,
                  fontSize: questTheme.typography.helperSize,
                  lineHeight: questTheme.typography.helperLineHeight,
                  marginTop: questTheme.spacing.xxs,
                }}
              >
                {item.meta}
              </Text>
              {item.detail ? (
                <Text
                  numberOfLines={1}
                  style={{
                    color: questTheme.colors.textSubtle,
                    fontSize: questTheme.typography.metaSize,
                    lineHeight: questTheme.typography.metaLineHeight,
                    marginTop: questTheme.spacing.xxs,
                  }}
                >
                  {item.detail}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              accessibilityLabel={deleteLabel}
              onPress={() => onDelete(item.id)}
              style={{
                width: 44,
                height: 44,
                borderRadius: questTheme.radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: questTheme.colors.textMuted,
                  fontSize: questTheme.typography.titleSize,
                  lineHeight: questTheme.typography.titleLineHeight,
                  fontWeight: questTheme.typography.weightBold,
                }}
              >
                ×
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))
      )}

      {hiddenCount > 0 ? (
        <Text
          style={{
            color: questTheme.colors.textMuted,
            fontSize: questTheme.typography.metaSize,
            lineHeight: questTheme.typography.metaLineHeight,
            textAlign: 'center',
          }}
        >
          {moreLabel.replace('{count}', String(hiddenCount))}
        </Text>
      ) : null}
    </View>
  );
}
