import { AddCashFlowEventModal } from '@/page-layout/widgets/cash-flow/components/AddCashFlowEventModal';
import { type CashFlowEventRecord } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowEventsForRecord';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { t } from '@lingui/core/macro';
import { useId } from 'react';
import { IconPlus } from 'twenty-ui/icon';
import { Button } from 'twenty-ui/input';

type AddCashFlowEventButtonProps = {
  opportunityId: string;
  forecastYear: number | null;
  currencyCode: string;
  events: CashFlowEventRecord[];
};

export const AddCashFlowEventButton = ({
  opportunityId,
  forecastYear,
  currencyCode,
  events,
}: AddCashFlowEventButtonProps) => {
  const modalInstanceId = `add-cash-flow-event-modal-${useId()}`;
  const { openModal } = useModal();

  return (
    <>
      <Button
        Icon={IconPlus}
        size="small"
        variant="secondary"
        title={t`Add cashflow event`}
        onClick={() => openModal(modalInstanceId)}
      />
      <AddCashFlowEventModal
        modalInstanceId={modalInstanceId}
        opportunityId={opportunityId}
        forecastYear={forecastYear}
        currencyCode={currencyCode}
        events={events}
      />
    </>
  );
};
