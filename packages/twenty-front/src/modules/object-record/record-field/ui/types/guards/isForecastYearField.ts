import { type FieldDefinition } from '@/object-record/record-field/ui/types/FieldDefinition';
import { type FieldMetadata } from '@/object-record/record-field/ui/types/FieldMetadata';
import { FORECAST_YEAR_FIELD_NAME } from '@/page-layout/widgets/cash-flow/constants/ForecastYearFieldName';

// Scoped to this one field so the forecast-year hint doesn't affect other number fields.
export const isForecastYearField = (
  field: Pick<FieldDefinition<FieldMetadata>, 'metadata'>,
): boolean =>
  field.metadata.objectMetadataNameSingular === 'opportunity' &&
  field.metadata.fieldName === FORECAST_YEAR_FIELD_NAME;
