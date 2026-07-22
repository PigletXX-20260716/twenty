import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useContext, useId } from 'react';

import { useNumberFormat } from '@/localization/hooks/useNumberFormat';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { useNumberFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useNumberFieldDisplay';
import { isLoanToValueRatioField } from '@/object-record/record-field/ui/types/guards/isLoanToValueRatioField';
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

export const NumberFieldDisplay = () => {
  const tooltipAnchorId = `loan-to-value-ratio-tooltip-anchor-${useId()}`;
  const { isDisplayInRecordTable } = useContext(FieldContext);
  const { fieldValue, fieldDefinition } = useNumberFieldDisplay();
  const type = fieldDefinition.metadata.settings?.type;
  const decimals = fieldDefinition.metadata.settings?.decimals;
  const { formatNumber } = useNumberFormat();

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

  const numberDisplay = (
    <NumberDisplay
      value={formattedValue}
      color={
        isHighLoanToValueRatio ? themeCssVariables.font.color.danger : undefined
      }
    />
  );

  const tooltipContent = getLoanToValueRatioTooltipContent({
    isLoanToValueRatio,
    isHighLoanToValueRatio,
    isDisplayInRecordTable,
  });

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
