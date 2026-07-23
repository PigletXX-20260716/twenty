import { StyledCashFlowCalloutBox } from '@/page-layout/widgets/cash-flow/components/CashFlowCalloutBox';
import { formatSignedShortCurrency } from '@/page-layout/widgets/cash-flow/utils/formatSignedShortCurrency';
import { Trans } from '@lingui/react/macro';

type CashFlowInsightCalloutProps = {
  troughValue: number;
  troughLabel: string;
  currencyCode: string;
};

export const CashFlowInsightCallout = ({
  troughValue,
  troughLabel,
  currencyCode,
}: CashFlowInsightCalloutProps) => {
  const formattedTroughValue = formatSignedShortCurrency(
    troughValue,
    currencyCode,
  );
  const isTroughAtStart = troughLabel === 'Start';

  return (
    <StyledCashFlowCalloutBox>
      {isTroughAtStart ? (
        <Trans>
          The largest cash shortfall of the year is{' '}
          <strong>{formattedTroughValue}</strong> at the start of the year. This
          is the point where the operation needs the most outside funding.
        </Trans>
      ) : (
        <Trans>
          The largest cash shortfall of the year is{' '}
          <strong>{formattedTroughValue}</strong> at end of {troughLabel}. This
          is the point where the operation needs the most outside funding.
        </Trans>
      )}
    </StyledCashFlowCalloutBox>
  );
};
