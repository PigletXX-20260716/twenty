import { isDefined } from 'twenty-shared/utils';

import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { type FieldCurrencyValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { CASH_FLOW_FIELD_NAMES } from '@/page-layout/widgets/cash-flow/constants/CashFlowFieldNames';
import { computeCashFlowSeries } from '@/page-layout/widgets/cash-flow/utils/computeCashFlowSeries';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';

const toDollars = (currencyValue: FieldCurrencyValue | null | undefined) =>
  (currencyValue?.amountMicros ?? 0) / 1_000_000;

export type WorstCaseLoanToValueTooltipData = {
  troughLabel: string;
  isTroughAtStart: boolean;
  shortfallAmount: number;
  worstCaseLoanAmount: number;
  currencyCode: string;
};

// Reads this record's own cash-flow inputs so the tooltip can name the
// specific season/shortfall that drove the worst-case LTV, reusing
// computeCashFlowSeries the same way CashFlowWidget.tsx does for the chart.
export const useWorstCaseLoanToValueTooltipData = (
  recordId: string | undefined,
): WorstCaseLoanToValueTooltipData | null => {
  const loanAmount = useAtomFamilySelectorValue(recordStoreFamilySelector, {
    recordId: recordId ?? '',
    fieldName: 'amount',
  }) as FieldCurrencyValue | null | undefined;

  const startingCashBalance = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: recordId ?? '',
      fieldName: CASH_FLOW_FIELD_NAMES.startingCashBalance,
    },
  ) as FieldCurrencyValue | null | undefined;

  const springNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: recordId ?? '',
      fieldName: CASH_FLOW_FIELD_NAMES.springNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;

  const summerNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: recordId ?? '',
      fieldName: CASH_FLOW_FIELD_NAMES.summerNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;

  const fallNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: recordId ?? '',
      fieldName: CASH_FLOW_FIELD_NAMES.fallNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;

  const winterNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: recordId ?? '',
      fieldName: CASH_FLOW_FIELD_NAMES.winterNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;

  if (
    !isDefined(recordId) ||
    !isDefined(loanAmount) ||
    !isDefined(startingCashBalance) ||
    !isDefined(springNetCashFlow) ||
    !isDefined(summerNetCashFlow) ||
    !isDefined(fallNetCashFlow) ||
    !isDefined(winterNetCashFlow)
  ) {
    return null;
  }

  const { points, troughIndex } = computeCashFlowSeries({
    startingBalance: toDollars(startingCashBalance),
    seasonNetCashFlows: [
      toDollars(springNetCashFlow),
      toDollars(summerNetCashFlow),
      toDollars(fallNetCashFlow),
      toDollars(winterNetCashFlow),
    ],
  });

  const troughPoint = points[troughIndex];

  // No negative dip means worst-case LTV equals baseline — nothing extra to explain.
  if (troughPoint.value >= 0) {
    return null;
  }

  return {
    troughLabel: troughPoint.label,
    isTroughAtStart: troughPoint.label === 'Start',
    shortfallAmount: Math.abs(troughPoint.value),
    worstCaseLoanAmount: toDollars(loanAmount) + Math.abs(troughPoint.value),
    currencyCode: startingCashBalance.currencyCode,
  };
};
