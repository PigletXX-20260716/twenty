import { StyledCashFlowCalloutBox } from '@/page-layout/widgets/cash-flow/components/CashFlowCalloutBox';
import { formatSignedShortCurrency } from '@/page-layout/widgets/cash-flow/utils/formatSignedShortCurrency';
import { Trans } from '@lingui/react/macro';

type CashFlowYearEndWarningProps = {
  yearEndValue: number;
  currencyCode: string;
};

export const CashFlowYearEndWarning = ({
  yearEndValue,
  currencyCode,
}: CashFlowYearEndWarningProps) => {
  const formattedYearEndValue = formatSignedShortCurrency(
    yearEndValue,
    currencyCode,
  );

  return (
    <StyledCashFlowCalloutBox>
      <Trans>
        Year-end balance: <strong>{formattedYearEndValue}</strong>. Hasn't
        recovered — could indicate a structural rather than seasonal shortfall.
        Review before renewal.
      </Trans>
    </StyledCashFlowCalloutBox>
  );
};
