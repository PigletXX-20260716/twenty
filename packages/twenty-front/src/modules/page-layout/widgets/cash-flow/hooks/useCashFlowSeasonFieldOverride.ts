import { useContext } from 'react';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { isCashFlowSeasonField } from '@/object-record/record-field/ui/types/guards/isCashFlowSeasonField';
import { type CashFlowEventRecord } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowEventsForRecord';
import { getSeasonForDate } from '@/page-layout/widgets/cash-flow/utils/getSeasonForDate';
import { getSeasonLabelForFieldName } from '@/page-layout/widgets/cash-flow/utils/getSeasonLabelForFieldName';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

export const useCashFlowSeasonFieldOverride = () => {
  const { recordId, fieldDefinition } = useContext(FieldContext);

  const isSeasonField = isCashFlowSeasonField(fieldDefinition);
  const seasonLabel = isSeasonField
    ? getSeasonLabelForFieldName(fieldDefinition.metadata.fieldName)
    : null;

  // Always called (rules of hooks) but network-skipped for every currency
  // field that isn't one of the four season fields.
  const { records } = useFindManyRecords<CashFlowEventRecord>({
    objectNameSingular: 'cashFlowEvent',
    filter: { opportunityId: { eq: recordId ?? '' } },
    skip: !isSeasonField,
  });

  if (!seasonLabel) {
    return { isComputedFromEvents: false, tooltipContent: null };
  }

  const eventCountForSeason = records.filter(
    (event) =>
      isDefined(event.eventDate) &&
      getSeasonForDate(new Date(event.eventDate)) === seasonLabel,
  ).length;

  if (eventCountForSeason === 0) {
    return { isComputedFromEvents: false, tooltipContent: null };
  }

  return {
    isComputedFromEvents: true,
    tooltipContent: t`Computed from ${eventCountForSeason} Cash Flow Events — edit or remove those events to change this value`,
  };
};
