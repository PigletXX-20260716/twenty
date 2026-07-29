import type { SEASON_LABELS } from '@/page-layout/widgets/cash-flow/utils/computeCashFlowSeries';

export type SeasonLabel = (typeof SEASON_LABELS)[number];

export const getSeasonForDate = (date: Date): SeasonLabel => {
  const month = date.getUTCMonth() + 1;

  if (month >= 3 && month <= 5) {
    return 'Spring';
  }
  if (month >= 6 && month <= 8) {
    return 'Summer';
  }
  if (month >= 9 && month <= 11) {
    return 'Fall';
  }
  return 'Winter';
};
