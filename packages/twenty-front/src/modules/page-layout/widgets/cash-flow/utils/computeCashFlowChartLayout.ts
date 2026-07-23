import { type CashFlowPoint } from '@/page-layout/widgets/cash-flow/utils/computeCashFlowSeries';

export const CASH_FLOW_CHART_VIEWBOX_WIDTH = 480;
export const CASH_FLOW_CHART_VIEWBOX_HEIGHT = 160;

const PLOT_LEFT = 20;
const PLOT_RIGHT = 460;
const PLOT_TOP = 28;
const PLOT_BOTTOM = 96;
const AXIS_LABEL_Y = 118;
const VALUE_LABEL_GAP = 12;
const VALUE_LABEL_MIN_Y = 10;

export type CashFlowChartPointLayout = {
  x: number;
  y: number;
  valueLabelY: number;
};

export type CashFlowChartLayout = {
  pointLayouts: CashFlowChartPointLayout[];
  zeroLineY: number;
  axisLabelY: number;
};

export const computeCashFlowChartLayout = (
  points: CashFlowPoint[],
): CashFlowChartLayout => {
  const values = points.map((point) => point.value);
  // Force zero into the domain so the $0 baseline is always drawn on the chart.
  const domainMin = Math.min(0, ...values);
  const domainMax = Math.max(0, ...values);
  const domainRange = domainMax - domainMin || 1;

  const scaleY = (value: number) =>
    PLOT_BOTTOM -
    ((value - domainMin) / domainRange) * (PLOT_BOTTOM - PLOT_TOP);

  const stepX =
    points.length > 1 ? (PLOT_RIGHT - PLOT_LEFT) / (points.length - 1) : 0;

  const pointLayouts: CashFlowChartPointLayout[] = points.map(
    (point, index) => {
      const y = scaleY(point.value);

      return {
        x: PLOT_LEFT + stepX * index,
        y,
        valueLabelY: Math.max(VALUE_LABEL_MIN_Y, y - VALUE_LABEL_GAP),
      };
    },
  );

  return {
    pointLayouts,
    zeroLineY: scaleY(0),
    axisLabelY: AXIS_LABEL_Y,
  };
};
