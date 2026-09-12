import React, {forwardRef} from 'react';
import InsightsV3Chart, {type InsightsV3ChartHandle} from '../../insights-v3/InsightsV3Chart';
import type {QuestLifeChartModelV1} from './contract';
export default forwardRef<InsightsV3ChartHandle,{model:QuestLifeChartModelV1}>(({model},ref)=><InsightsV3Chart {...model.presentation} ref={ref}/>);
