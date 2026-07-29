import { AddCashFlowEventButton } from '@/page-layout/widgets/cash-flow/components/AddCashFlowEventButton';
import { CashFlowEventListRow } from '@/page-layout/widgets/cash-flow/components/CashFlowEventListRow';
import { type CashFlowEventRecord } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowEventsForRecord';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: flex-end;
`;

const StyledList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing['1']};
  margin-top: ${themeCssVariables.spacing['2']};
`;

const StyledEmptyState = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  padding: ${themeCssVariables.spacing['2']} 0;
`;

type CashFlowEventsSectionProps = {
  opportunityId: string;
  forecastYear: number | null;
  events: CashFlowEventRecord[];
  currencyCode: string;
};

export const CashFlowEventsSection = ({
  opportunityId,
  forecastYear,
  events,
  currencyCode,
}: CashFlowEventsSectionProps) => {
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.eventDate) {
      return 1;
    }
    if (!b.eventDate) {
      return -1;
    }
    return a.eventDate.localeCompare(b.eventDate);
  });

  return (
    <div>
      <StyledHeader>
        <AddCashFlowEventButton
          opportunityId={opportunityId}
          forecastYear={forecastYear}
          currencyCode={currencyCode}
          events={events}
        />
      </StyledHeader>
      <StyledList>
        {sortedEvents.length === 0 ? (
          <StyledEmptyState>{t`No cash flow events logged yet`}</StyledEmptyState>
        ) : (
          sortedEvents.map((event) => (
            <CashFlowEventListRow key={event.id} event={event} />
          ))
        )}
      </StyledList>
    </div>
  );
};
