import { CashFlowEventRow } from '@/page-layout/widgets/cash-flow/components/CashFlowEventRow';
import { type CashFlowEventRecord } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowEventsForRecord';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledContainer = styled.div`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  box-shadow: ${themeCssVariables.boxShadow.strong};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing['2']};
  max-height: 320px;
  overflow-y: auto;
  padding: ${themeCssVariables.spacing['3']};
  width: 260px;
`;

const StyledEmptyState = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  padding: ${themeCssVariables.spacing['2']} 0;
  text-align: center;
`;

type CashFlowSeasonEventsDropdownProps = {
  events: CashFlowEventRecord[];
};

export const CashFlowSeasonEventsDropdown = ({
  events,
}: CashFlowSeasonEventsDropdownProps) => {
  return (
    <StyledContainer>
      {events.length === 0 ? (
        <StyledEmptyState>{t`No cash flow events yet`}</StyledEmptyState>
      ) : (
        events.map((event) => <CashFlowEventRow key={event.id} event={event} />)
      )}
    </StyledContainer>
  );
};
