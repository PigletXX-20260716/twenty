import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useContext, useId } from 'react';

import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useNumberFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useNumberFieldDisplay';
import { isForecastYearField } from '@/object-record/record-field/ui/types/guards/isForecastYearField';
import { isLoanToValueRatioField } from '@/object-record/record-field/ui/types/guards/isLoanToValueRatioField';
import { isWorstCaseLoanToValueRatioField } from '@/object-record/record-field/ui/types/guards/isWorstCaseLoanToValueRatioField';
import {
  type WorstCaseLoanToValueTooltipData,
  useWorstCaseLoanToValueTooltipData,
} from '@/page-layout/widgets/cash-flow/hooks/useWorstCaseLoanToValueTooltipData';
import { formatSignedShortCurrency } from '@/page-layout/widgets/cash-flow/utils/formatSignedShortCurrency';
import { NumberDisplay } from '@/ui/field/display/components/NumberDisplay';
import { formatToShortNumber, isDefined } from 'twenty-shared/utils';
import { AppTooltip, TooltipDelay } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledTooltipAnchor = styled.div`
  width: 100%;
`;

// Exported so the branching can be unit tested without rendering the component.
export const getLoanToValueRatioTooltipContent = ({
  isLoanToValueRatio,
  isHighLoanToValueRatio,
  isDisplayInRecordTable,
}: {
  isLoanToValueRatio: boolean;
  isHighLoanToValueRatio: boolean;
  isDisplayInRecordTable?: boolean;
}): string | null => {
  if (!isLoanToValueRatio) {
    return null;
  }

  // In the table, only the over-100% cells get a (short, risk-only) tooltip —
  // showing the full explainer on every row would fire on every cell the
  // mouse passes over while scrolling down the column.
  if (isDisplayInRecordTable) {
    return isHighLoanToValueRatio
      ? t`Loan amount is greater than property value — high risk of being unable to reclaim debts.`
      : null;
  }

  return t`Loan-to-Value Ratio = Loan Amount ÷ Farm Property Value. A ratio over 100% means the loan amount exceeds the property’s value, shown in red as a risk flag.`;
};

const getForecastYearTooltipContent = (
  isForecastYear: boolean,
): string | null =>
  isForecastYear
    ? t`Defines the 12-month forecast window: March 1 of this year through the last day of February the following year. New Cash Flow Events must fall within this window; changing this value does not check existing events.`
    : null;

// Exported so the branching can be unit tested without rendering the component.
export const getWorstCaseLoanToValueRatioTooltipContent = ({
  isWorstCaseLoanToValueRatio,
  isHighWorstCaseLoanToValueRatio,
  isDisplayInRecordTable,
  troughData,
}: {
  isWorstCaseLoanToValueRatio: boolean;
  isHighWorstCaseLoanToValueRatio: boolean;
  isDisplayInRecordTable?: boolean;
  troughData: WorstCaseLoanToValueTooltipData | null;
}): string | null => {
  if (!isWorstCaseLoanToValueRatio) {
    return null;
  }

  // Same rationale as the LTV field's table-mode short-circuit — avoid a
  // tooltip firing on every row while scrolling down the column.
  if (isDisplayInRecordTable) {
    return isHighWorstCaseLoanToValueRatio
      ? t`Worst-case LTV (accounting for the seasonal cash shortfall) exceeds 100% — worth investigating.`
      : null;
  }

  if (!troughData) {
    return t`Worst-Case LTV = (Loan Amount + Seasonal Cash Shortfall) ÷ Farm Property Value. A ratio over 100% means the loan is worth investigating.`;
  }

  const formattedShortfall = formatSignedShortCurrency(
    -troughData.shortfallAmount,
    troughData.currencyCode,
  );
  const formattedWorstCaseLoanAmount = formatSignedShortCurrency(
    troughData.worstCaseLoanAmount,
    troughData.currencyCode,
  );
  const whenText = troughData.isTroughAtStart
    ? t`at the start of the year`
    : t`at end of ${troughData.troughLabel}`;

  return t`Worst-Case LTV = (Loan Amount + Seasonal Cash Shortfall) ÷ Farm Property Value. This record's largest projected shortfall is ${formattedShortfall} ${whenText}, bringing the worst-case loan value to ${formattedWorstCaseLoanAmount}. A ratio over 100% is worth investigating.`;
};

export const NumberFieldDisplay = () => {
  const tooltipAnchorId = `loan-to-value-ratio-tooltip-anchor-${useId()}`;
  const { recordId, isDisplayInRecordTable } = useContext(FieldContext);
  const { fieldValue, fieldDefinition } = useNumberFieldDisplay();
  const type = fieldDefinition.metadata.settings?.type;
  const decimals = fieldDefinition.metadata.settings?.decimals;
  const { formatNumber } = useNumberFormat();
  const worstCaseLoanToValueTooltipData =
    useWorstCaseLoanToValueTooltipData(recordId);

  if (!isDefined(fieldValue)) {
    return <NumberDisplay value={null} />;
  }

  const numericValue = Number(fieldValue);
  let formattedValue: string;

  if (type === 'percentage') {
    formattedValue = `${formatNumber(numericValue * 100, { decimals })}%`;
  } else if (type === 'shortNumber') {
    formattedValue = formatToShortNumber(numericValue);
  } else {
    formattedValue = formatNumber(numericValue, { decimals });
  }

  const isLoanToValueRatio = isLoanToValueRatioField(fieldDefinition);
  const isHighLoanToValueRatio = isLoanToValueRatio && numericValue > 1;

  const isWorstCaseLoanToValueRatio =
    isWorstCaseLoanToValueRatioField(fieldDefinition);
  const isHighWorstCaseLoanToValueRatio =
    isWorstCaseLoanToValueRatio && numericValue > 1;

  const numberDisplay = (
    <NumberDisplay
      value={formattedValue}
      color={
        isHighLoanToValueRatio || isHighWorstCaseLoanToValueRatio
          ? themeCssVariables.font.color.danger
          : undefined
      }
    />
  );

  const tooltipContent =
    getLoanToValueRatioTooltipContent({
      isLoanToValueRatio,
      isHighLoanToValueRatio,
      isDisplayInRecordTable,
    }) ??
    getWorstCaseLoanToValueRatioTooltipContent({
      isWorstCaseLoanToValueRatio,
      isHighWorstCaseLoanToValueRatio,
      isDisplayInRecordTable,
      troughData: worstCaseLoanToValueTooltipData,
    }) ??
    getForecastYearTooltipContent(isForecastYearField(fieldDefinition));

  if (!isDefined(tooltipContent)) {
    return numberDisplay;
  }

  return (
    <StyledTooltipAnchor id={tooltipAnchorId}>
      {numberDisplay}
      <AppTooltip
        anchorSelect={`#${tooltipAnchorId}`}
        delay={TooltipDelay.shortDelay}
        place="bottom"
      >
        {tooltipContent}
      </AppTooltip>
    </StyledTooltipAnchor>
  );
};
