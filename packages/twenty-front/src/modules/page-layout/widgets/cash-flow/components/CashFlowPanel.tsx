import { CashFlowChart } from '@/page-layout/widgets/cash-flow/components/CashFlowChart';
import { CashFlowInsightCallout } from '@/page-layout/widgets/cash-flow/components/CashFlowInsightCallout';
import { CashFlowSeasonCards } from '@/page-layout/widgets/cash-flow/components/CashFlowSeasonCards';
import { CashFlowYearEndWarning } from '@/page-layout/widgets/cash-flow/components/CashFlowYearEndWarning';
import { computeCashFlowSeries } from '@/page-layout/widgets/cash-flow/utils/computeCashFlowSeries';
import { formatSignedShortCurrency } from '@/page-layout/widgets/cash-flow/utils/formatSignedShortCurrency';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  box-sizing: border-box;
  padding: ${themeCssVariables.spacing['5']};
  width: 100%;
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.semiBold};
`;

const StyledSubtitle = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  margin-bottom: ${themeCssVariables.spacing['4']};
`;

const StyledSectionLabel = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xxs};
  font-weight: ${themeCssVariables.font.weight.medium};
  margin-bottom: ${themeCssVariables.spacing['1']};
  margin-top: ${themeCssVariables.spacing['5']};
  text-transform: uppercase;
`;

type CashFlowPanelProps = {
  startingBalance: number;
  seasonNetCashFlows: [number, number, number, number];
  currencyCode: string;
};

export const CashFlowPanel = ({
  startingBalance,
  seasonNetCashFlows,
  currencyCode,
}: CashFlowPanelProps) => {
  const { points, seasonNets, troughIndex } = computeCashFlowSeries({
    startingBalance,
    seasonNetCashFlows,
  });

  const troughPoint = points[troughIndex];
  const troughSeasonLabel =
    troughPoint.label === 'Start' ? undefined : troughPoint.label;
  // A trough that never dips below zero means the operation was never
  // short on cash — there's no funding need to call out.
  const hasFundingNeed = troughPoint.value < 0;

  const yearEndPoint = points[points.length - 1];
  // Independent of the trough: even if the worst point of the year was
  // earlier (e.g. a mid-year dip), ending the year still underwater is its
  // own signal worth flagging separately.
  const hasYearEndShortfall = yearEndPoint.value < 0;

  return (
    <StyledContainer>
      <StyledTitle>{t`Seasonal Cash Flow Forecast`}</StyledTitle>
      <StyledSubtitle>
        {t`Starting cash balance ${formatSignedShortCurrency(startingBalance, currencyCode)}`}
      </StyledSubtitle>

      <StyledSectionLabel>{t`Running cash balance`}</StyledSectionLabel>
      <CashFlowChart
        points={points}
        troughIndex={troughIndex}
        currencyCode={currencyCode}
      />

      <StyledSectionLabel>{t`Seasonal net change`}</StyledSectionLabel>
      <CashFlowSeasonCards
        seasonNets={seasonNets}
        troughSeasonLabel={troughSeasonLabel}
        currencyCode={currencyCode}
      />

      {hasFundingNeed && (
        <CashFlowInsightCallout
          troughValue={troughPoint.value}
          troughLabel={troughPoint.label}
          currencyCode={currencyCode}
        />
      )}

      {hasYearEndShortfall && (
        <CashFlowYearEndWarning
          yearEndValue={yearEndPoint.value}
          currencyCode={currencyCode}
        />
      )}
    </StyledContainer>
  );
};
