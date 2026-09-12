import React,{forwardRef} from 'react';
import type WebChart from './InsightsV3Chart';
import type {InsightsV3ChartHandle} from './InsightsV3Chart';
import QuantChart from '../platform/charts/QuantChart.native';
export default forwardRef<InsightsV3ChartHandle,React.ComponentProps<typeof WebChart>>((props,ref)=><QuantChart ref={ref} model={{version:1,presentation:props}}/>);
