import { CASH_FLOW_FIELD_NAMES } from '@/page-layout/widgets/cash-flow/constants/CashFlowFieldNames';
import { type SeasonLabel } from '@/page-layout/widgets/cash-flow/utils/getSeasonForDate';

const SEASON_LABEL_BY_FIELD_NAME: Record<string, SeasonLabel> = {
  [CASH_FLOW_FIELD_NAMES.springNetCashFlow]: 'Spring',
  [CASH_FLOW_FIELD_NAMES.summerNetCashFlow]: 'Summer',
  [CASH_FLOW_FIELD_NAMES.fallNetCashFlow]: 'Fall',
  [CASH_FLOW_FIELD_NAMES.winterNetCashFlow]: 'Winter',
};

export const getSeasonLabelForFieldName = (
  fieldName: string,
): SeasonLabel | null => SEASON_LABEL_BY_FIELD_NAME[fieldName] ?? null;
