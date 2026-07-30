import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { CASH_FLOW_EVENT_FIELD_NAMES } from '@/page-layout/widgets/cash-flow/constants/CashFlowEventFieldNames';

// Scoped to this one field so the forecast-window hint doesn't affect other date fields.
export const isCashFlowEventDateField = (
  field: Pick<FieldDefinition<FieldMetadata>, 'metadata'>,
): boolean =>
  field.metadata.objectMetadataNameSingular === 'cashFlowEvent' &&
  field.metadata.fieldName === CASH_FLOW_EVENT_FIELD_NAMES.eventDate;
