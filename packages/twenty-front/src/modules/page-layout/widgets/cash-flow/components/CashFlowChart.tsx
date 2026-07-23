import { formatSignedShortCurrency } from '@/page-layout/widgets/cash-flow/utils/formatSignedShortCurrency';
import {
  CASH_FLOW_CHART_VIEWBOX_HEIGHT,
  CASH_FLOW_CHART_VIEWBOX_WIDTH,
  computeCashFlowChartLayout,
} from '@/page-layout/widgets/cash-flow/utils/computeCashFlowChartLayout';
import { type CashFlowPoint } from '@/page-layout/widgets/cash-flow/utils/computeCashFlowSeries';
import { useContext } from 'react';
import { ThemeContext } from 'twenty-ui/theme-constants';

type CashFlowChartProps = {
  points: CashFlowPoint[];
  troughIndex: number;
  currencyCode: string;
};

export const CashFlowChart = ({
  points,
  troughIndex,
  currencyCode,
}: CashFlowChartProps) => {
  const { theme } = useContext(ThemeContext);

  const { pointLayouts, zeroLineY, axisLabelY } =
    computeCashFlowChartLayout(points);

  const polylinePoints = pointLayouts.map(({ x, y }) => `${x},${y}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${CASH_FLOW_CHART_VIEWBOX_WIDTH} ${CASH_FLOW_CHART_VIEWBOX_HEIGHT}`}
      style={{
        width: '100%',
        height: CASH_FLOW_CHART_VIEWBOX_HEIGHT,
        display: 'block',
      }}
    >
      <line
        x1={0}
        y1={zeroLineY}
        x2={CASH_FLOW_CHART_VIEWBOX_WIDTH}
        y2={zeroLineY}
        stroke={theme.border.color.medium}
        strokeDasharray="3,3"
      />
      <text
        x={CASH_FLOW_CHART_VIEWBOX_WIDTH - 4}
        y={zeroLineY + 4}
        fontSize={9}
        fill={theme.font.color.tertiary}
        textAnchor="end"
      >
        {formatSignedShortCurrency(0, currencyCode)}
      </text>

      <polyline
        points={polylinePoints}
        fill="none"
        stroke={theme.font.color.primary}
        strokeWidth={2.5}
      />

      {pointLayouts.map((pointLayout, index) => {
        const isTrough = index === troughIndex;
        const point = points[index];

        const valueColor = isTrough
          ? theme.font.color.danger
          : point.value > 0
            ? theme.color.turquoise8
            : theme.font.color.primary;

        return (
          <g key={point.label}>
            <circle
              cx={pointLayout.x}
              cy={pointLayout.y}
              r={isTrough ? 5.5 : 4}
              fill={isTrough ? theme.color.red8 : theme.font.color.primary}
            />
            <text
              x={pointLayout.x}
              y={pointLayout.valueLabelY}
              fontSize={11}
              fontWeight={isTrough ? 700 : 600}
              textAnchor="middle"
              fill={valueColor}
            >
              {formatSignedShortCurrency(point.value, currencyCode)}
            </text>
            <text
              x={pointLayout.x}
              y={axisLabelY}
              fontSize={10}
              fontWeight={isTrough ? 600 : undefined}
              textAnchor="middle"
              fill={
                isTrough ? theme.font.color.danger : theme.font.color.tertiary
              }
            >
              {point.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
