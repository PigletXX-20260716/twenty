import { CashFlowEventRow } from '@/page-layout/widgets/cash-flow/components/CashFlowEventRow';
import { type CashFlowEventRecord } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowEventsForRecord';
import { useOpenRecordInSidePanel } from '@/side-panel/hooks/useOpenRecordInSidePanel';
import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledClickableRow = styled.div`
  border-radius: ${themeCssVariables.border.radius.sm};
  cursor: pointer;
  padding: ${themeCssVariables.spacing['1']} ${themeCssVariables.spacing['2']};

  &:hover {
    background: ${themeCssVariables.background.transparent.light};
  }
`;

type CashFlowEventListRowProps = {
  event: CashFlowEventRecord;
};

export const CashFlowEventListRow = ({ event }: CashFlowEventListRowProps) => {
  const { openRecordInSidePanel } = useOpenRecordInSidePanel();

  return (
    <StyledClickableRow
      onClick={() =>
        openRecordInSidePanel({
          recordId: event.id,
          objectNameSingular: 'cashFlowEvent',
        })
      }
    >
      <CashFlowEventRow event={event} />
    </StyledClickableRow>
  );
};
