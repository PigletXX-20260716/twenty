import { isCashFlowSeasonField } from '@/object-record/record-field/ui/types/guards/isCashFlowSeasonField';
import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { type CashFlowEventRecord } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowEventsForRecord';
import { getSeasonLabelForFieldName } from '@/page-layout/widgets/cash-flow/utils/getSeasonLabelForFieldName';
import { type SeasonLabel } from '@/page-layout/widgets/cash-flow/utils/getSeasonForDate';

// Plain (non-hook) lookup for call sites that render many fields in a loop
// and already fetched eventsBySeasonLabel once for the whole record.
export const getIsCashFlowSeasonFieldComputedFromEvents = ({
  fieldDefinition,
  eventsBySeasonLabel,
}: {
  fieldDefinition: FieldDefinition<FieldMetadata>;
  eventsBySeasonLabel: Record<SeasonLabel, CashFlowEventRecord[]>;
}): boolean => {
  if (!isCashFlowSeasonField(fieldDefinition)) {
    return false;
  }

  const seasonLabel = getSeasonLabelForFieldName(
    fieldDefinition.metadata.fieldName,
  );

  return seasonLabel ? eventsBySeasonLabel[seasonLabel].length > 0 : false;
};
