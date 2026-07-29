import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { CASH_FLOW_FIELD_NAMES } from '@/page-layout/widgets/cash-flow/constants/CashFlowFieldNames';

const SEASON_FIELD_NAMES: string[] = [
  CASH_FLOW_FIELD_NAMES.springNetCashFlow,
  CASH_FLOW_FIELD_NAMES.summerNetCashFlow,
  CASH_FLOW_FIELD_NAMES.fallNetCashFlow,
  CASH_FLOW_FIELD_NAMES.winterNetCashFlow,
];

// Scoped to these four fields so the computed-from-events override doesn't
// affect startingCashBalance (not seasonal) or any other currency field.
export const isCashFlowSeasonField = (
  field: Pick<FieldDefinition<FieldMetadata>, 'metadata'>,
): boolean =>
  field.metadata.objectMetadataNameSingular === 'opportunity' &&
  SEASON_FIELD_NAMES.includes(field.metadata.fieldName);
