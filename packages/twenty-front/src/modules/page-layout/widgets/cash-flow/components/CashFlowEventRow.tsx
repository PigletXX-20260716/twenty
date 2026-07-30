import { type CashFlowEventRecord } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowEventsForRecord';
import { formatSignedShortCurrency } from '@/page-layout/widgets/cash-flow/utils/formatSignedShortCurrency';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledRow = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing['2']};
  justify-content: space-between;
`;

const StyledLeft = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const StyledTitle = styled.div`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledDate = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xxs};
`;

const StyledAmount = styled.div<{ isNegative: boolean }>`
  color: ${({ isNegative }) =>
    isNegative
      ? themeCssVariables.font.color.danger
      : themeCssVariables.color.turquoise8};
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

type CashFlowEventRowProps = {
  event: CashFlowEventRecord;
};

export const CashFlowEventRow = ({ event }: CashFlowEventRowProps) => {
  const amountMicros = event.amount?.amountMicros ?? 0;
  const dollars = amountMicros / 1_000_000;
  const currencyCode = event.amount?.currencyCode ?? 'USD';

  const formattedDate = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <StyledRow>
      <StyledLeft>
        <StyledTitle>{event.title || '—'}</StyledTitle>
        <StyledDate>{formattedDate}</StyledDate>
      </StyledLeft>
      <StyledAmount isNegative={dollars < 0}>
        {formatSignedShortCurrency(dollars, currencyCode)}
      </StyledAmount>
    </StyledRow>
  );
};
