import { formatSignedShortCurrency } from '@/page-layout/widgets/cash-flow/utils/formatSignedShortCurrency';
import { type CashFlowSeasonNet } from '@/page-layout/widgets/cash-flow/utils/computeCashFlowSeries';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing['2']};
  grid-template-columns: repeat(4, 1fr);
`;

const StyledCard = styled.div<{ isTrough: boolean }>`
  background: ${({ isTrough }) =>
    isTrough ? themeCssVariables.background.danger : 'transparent'};
  border: 1px solid
    ${({ isTrough }) =>
      isTrough
        ? themeCssVariables.border.color.danger
        : themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  padding: ${themeCssVariables.spacing['2']};
`;

const StyledLabel = styled.div<{ isTrough: boolean }>`
  color: ${({ isTrough }) =>
    isTrough
      ? themeCssVariables.font.color.danger
      : themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xxs};
  letter-spacing: 0.03em;
  text-transform: uppercase;
`;

const StyledValue = styled.div<{ isNegative: boolean }>`
  color: ${({ isNegative }) =>
    isNegative
      ? themeCssVariables.font.color.danger
      : themeCssVariables.color.turquoise8};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin-top: ${themeCssVariables.spacing['1']};
`;

type CashFlowSeasonCardsProps = {
  seasonNets: CashFlowSeasonNet[];
  troughSeasonLabel: string | undefined;
  currencyCode: string;
};

export const CashFlowSeasonCards = ({
  seasonNets,
  troughSeasonLabel,
  currencyCode,
}: CashFlowSeasonCardsProps) => {
  return (
    <StyledGrid>
      {seasonNets.map((seasonNet) => {
        const isTrough = seasonNet.label === troughSeasonLabel;

        return (
          <StyledCard key={seasonNet.label} isTrough={isTrough}>
            <StyledLabel isTrough={isTrough}>{seasonNet.label} net</StyledLabel>
            <StyledValue isNegative={seasonNet.value < 0}>
              {formatSignedShortCurrency(seasonNet.value, currencyCode)}
            </StyledValue>
          </StyledCard>
        );
      })}
    </StyledGrid>
  );
};
