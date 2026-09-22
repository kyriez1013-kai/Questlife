import React from 'react';
import NativeInsightsExperience from './insights/NativeInsightsExperience';
import { deliverNotificationIntent } from '../platform/notifications/intentBus';
import { createInsightsEntrances, type InsightsNavigation } from './insights/nativeInsightsCatalog';

export default function NativeInsightsScreen({ navigation }: { navigation: InsightsNavigation }) {
  return <NativeInsightsExperience {...createInsightsEntrances(navigation, deliverNotificationIntent)} />;
}
