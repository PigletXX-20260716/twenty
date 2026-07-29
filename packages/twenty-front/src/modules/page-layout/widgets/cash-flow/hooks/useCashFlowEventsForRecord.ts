import { useMemo } from 'react';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import type { CASH_FLOW_EVENT_FIELD_NAMES } from '@/page-layout/widgets/cash-flow/constants/CashFlowEventFieldNames';
import { SEASON_LABELS } from '@/page-layout/widgets/cash-flow/utils/computeCashFlowSeries';
import {
  getSeasonForDate,
  type SeasonLabel,
} from '@/page-layout/widgets/cash-flow/utils/getSeasonForDate';

export type CashFlowEventRecord = {
  __typename: string;
  id: string;
  [CASH_FLOW_EVENT_FIELD_NAMES.title]: string | null;
  [CASH_FLOW_EVENT_FIELD_NAMES.eventDate]: string | null;
  [CASH_FLOW_EVENT_FIELD_NAMES.amount]: {
    amountMicros: number | null;
    currencyCode: string;
  } | null;
};

export const useCashFlowEventsForRecord = (opportunityId: string) => {
  const { records, loading } = useFindManyRecords<CashFlowEventRecord>({
    objectNameSingular: 'cashFlowEvent',
    filter: { opportunityId: { eq: opportunityId } },
  });

  const eventsBySeasonLabel = useMemo(() => {
    const grouped = Object.fromEntries(
      SEASON_LABELS.map((label) => [label, [] as CashFlowEventRecord[]]),
    ) as Record<SeasonLabel, CashFlowEventRecord[]>;

    records.forEach((event) => {
      if (!event.eventDate) {
        return;
      }
      const season = getSeasonForDate(new Date(event.eventDate));
      grouped[season].push(event);
    });

    return grouped;
  }, [records]);

  return { events: records, eventsBySeasonLabel, loading };
};
