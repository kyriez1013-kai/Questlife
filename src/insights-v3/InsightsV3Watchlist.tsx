import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Lang } from '../i18n';
import type { QuestVisualFoundation } from '../design/visualFoundation';
import type { QuantProductConsumerModel } from '../quant-product/quantProductV1Adapter';
import { formatQuantValue, instrumentLabel, unitLabel } from './insightsV3Presentation';
import type { InsightsV3WatchlistPreferences } from './insightsV3WatchlistPreferences';
import { iv3 } from './insightsV3I18n';

const WebView = View as any;
const WebPressable = Pressable as any;

export default function InsightsV3Watchlist({
  foundation,
  lang,
  model,
  onAdd,
  onMove,
  onRemove,
  onSelect,
  onTogglePin,
  preferences,
  selectedId,
}: {
  foundation: QuestVisualFoundation;
  lang: Lang;
  model: QuantProductConsumerModel;
  onAdd: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onSelect: (id: string) => void;
  onTogglePin: (id: string) => void;
  preferences: InsightsV3WatchlistPreferences;
  selectedId: string;
}) {
  const byId = new Map(model.instruments.map((instrument) => [instrument.id, instrument]));
  const visible = preferences.order.flatMap((id) => byId.get(id) ? [byId.get(id)!] : []);
  const hidden = model.instruments.filter((instrument) => !preferences.order.includes(instrument.id));

  return (
    <WebView dataSet={{ 'insights-v3-role': 'watchlist-manager' }}>
      <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'watchlistBody')}</Text>
      {visible.length ? (
        <WebView dataSet={{ 'insights-v3-role': 'watchlist-manager-list' }}>
          {visible.map((instrument, index) => {
            const pinned = preferences.pinnedIds.includes(instrument.id);
            const selected = instrument.id === selectedId;
            return (
              <WebView dataSet={{ 'insights-v3-role': 'watchlist-manager-row' }} key={instrument.id}>
                <WebPressable
                  accessibilityLabel={instrumentLabel(lang, instrument)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  dataSet={{ 'insights-v3-role': 'watchlist-manager-select' }}
                  onPress={() => onSelect(instrument.id)}
                >
                  <Text numberOfLines={2} style={{ color: foundation.text.primary }}>{instrumentLabel(lang, instrument)}</Text>
                  <Text style={{ color: foundation.text.metadata }}>
                    {formatQuantValue(instrument.latest?.value, instrument.unit, lang)} {unitLabel(instrument.unit, lang)}
                  </Text>
                </WebPressable>
                <WebView dataSet={{ 'insights-v3-role': 'watchlist-manager-actions' }}>
                  <WebPressable
                    accessibilityLabel={iv3(lang, pinned ? 'unpinInstrument' : 'pinInstrument')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: pinned }}
                    disabled={!pinned && preferences.pinnedIds.length >= 5}
                    onPress={() => onTogglePin(instrument.id)}
                  >
                    <Text style={{ color: pinned ? foundation.interaction.primary : foundation.text.secondary }}>⌖</Text>
                  </WebPressable>
                  <WebPressable
                    accessibilityLabel={iv3(lang, 'moveInstrumentUp')}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: index === 0 }}
                    disabled={index === 0}
                    onPress={() => onMove(instrument.id, -1)}
                  >
                    <Text style={{ color: index === 0 ? foundation.text.disabled : foundation.text.secondary }}>↑</Text>
                  </WebPressable>
                  <WebPressable
                    accessibilityLabel={iv3(lang, 'moveInstrumentDown')}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: index === visible.length - 1 }}
                    disabled={index === visible.length - 1}
                    onPress={() => onMove(instrument.id, 1)}
                  >
                    <Text style={{ color: index === visible.length - 1 ? foundation.text.disabled : foundation.text.secondary }}>↓</Text>
                  </WebPressable>
                  <WebPressable accessibilityLabel={iv3(lang, 'removeInstrument')} accessibilityRole="button" onPress={() => onRemove(instrument.id)}>
                    <Text style={{ color: foundation.text.secondary }}>×</Text>
                  </WebPressable>
                </WebView>
              </WebView>
            );
          })}
        </WebView>
      ) : <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'watchlistEmpty')}</Text>}

      <Text style={{ color: foundation.text.metadata }}>{iv3(lang, 'availableInstruments')}</Text>
      {hidden.length ? hidden.map((instrument) => (
        <WebPressable
          accessibilityLabel={`${iv3(lang, 'addInstrument')} · ${instrumentLabel(lang, instrument)}`}
          accessibilityRole="button"
          dataSet={{ 'insights-v3-role': 'watchlist-add-row' }}
          key={instrument.id}
          onPress={() => onAdd(instrument.id)}
        >
          <Text numberOfLines={2} style={{ color: foundation.text.primary }}>{instrumentLabel(lang, instrument)}</Text>
          <Text style={{ color: foundation.interaction.primary }}>{iv3(lang, 'addInstrument')}</Text>
        </WebPressable>
      )) : <Text style={{ color: foundation.text.secondary }}>{iv3(lang, 'noHiddenInstruments')}</Text>}
    </WebView>
  );
}
