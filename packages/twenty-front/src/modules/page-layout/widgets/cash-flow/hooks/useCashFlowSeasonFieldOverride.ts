import { useContext } from 'react';

import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { FieldContext } from '@/object-record/record-field/ui/contexts/FieldContext';
import { isCashFlowSeasonField } from '@/object-record/record-field/ui/types/guards/isCashFlowSeasonField';
import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { type CashFlowEventRecord } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowEventsForRecord';
import { getSeasonForDate } from '@/page-layout/widgets/cash-flow/utils/getSeasonForDate';
import { getSeasonLabelForFieldName } from '@/page-layout/widgets/cash-flow/utils/getSeasonLabelForFieldName';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

// Parameterized so call sites that haven't mounted a FieldContext.Provider
// yet (e.g. table cells computing isRecordFieldReadOnly before rendering
// their own Provider) can call it directly with local values.
export const useCashFlowComputedSeasonFieldOverride = ({
  recordId,
  fieldDefinition,
  disableOverride,
}: {
  recordId: string | undefined;
  fieldDefinition: FieldDefinition<FieldMetadata>;
  disableOverride?: boolean;
}) => {
  const isSeasonField = isCashFlowSeasonField(fieldDefinition);
  const seasonLabel = isSeasonField
    ? getSeasonLabelForFieldName(fieldDefinition.metadata.fieldName)
    : null;

  // Always called (rules of hooks) but network-skipped for every currency
  // field that isn't one of the four season fields, and for callers (e.g.
  // activity-diff rows) that pass a synthetic recordId rather than a real one.
  const { records } = useFindManyRecords<CashFlowEventRecord>({
    objectNameSingular: 'cashFlowEvent',
    filter: { opportunityId: { eq: recordId ?? '' } },
    skip: !isSeasonField || disableOverride === true,
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

export const useCashFlowSeasonFieldOverride = () => {
  const { recordId, fieldDefinition, disableComputedFieldOverride } =
    useContext(FieldContext);

  return useCashFlowComputedSeasonFieldOverride({
    recordId,
    fieldDefinition,
    disableOverride: disableComputedFieldOverride,
  });
};
