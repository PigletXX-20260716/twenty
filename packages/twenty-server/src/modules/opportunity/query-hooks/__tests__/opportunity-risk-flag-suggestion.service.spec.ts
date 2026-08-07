import { type CurrencyMetadata } from 'twenty-shared/types';

import {
  OpportunityRiskFlagSuggestionService,
  type RiskFlagSuggestionInputs,
} from 'src/modules/opportunity/query-hooks/opportunity-risk-flag-suggestion.service';

const currency = (units: number): CurrencyMetadata => ({
  amountMicros: units * 1_000_000,
  currencyCode: 'USD',
});

const buildInputs = (
  overrides: Partial<RiskFlagSuggestionInputs>,
): RiskFlagSuggestionInputs => ({
  loanAmount: currency(300_000),
  currentLoanToValueRatio: 0.6,
  worstCaseLoanToValueRatio: 0.7,
  yearEndCashBalance: currency(20_000),
  isCashFlowDataMissing: false,
  ...overrides,
});

describe('OpportunityRiskFlagSuggestionService', () => {
  const service = new OpportunityRiskFlagSuggestionService(
    undefined as unknown as never,
  );

  // Eval Set (v1) quick-reference table - each case name matches the ID
  // used in the Notion eval set doc.
  it.each([
    // Single-factor cases
    ['S1', buildInputs({}), 'APPROVE'],
    [
      'S2',
      buildInputs({ loanAmount: currency(920_000) }),
      'MANUALREVIEW',
    ],
    ['S3', buildInputs({ currentLoanToValueRatio: 0.88, worstCaseLoanToValueRatio: 0.95 }), 'MANUALREVIEW'],
    ['S4', buildInputs({ currentLoanToValueRatio: 1.05, worstCaseLoanToValueRatio: 1.15 }), 'DECLINE'],
    ['S5', buildInputs({ worstCaseLoanToValueRatio: 1.08 }), 'MANUALREVIEW'],
    ['S6', buildInputs({ yearEndCashBalance: currency(-8_000) }), 'MANUALREVIEW'],
    // Missing required-field cases
    ['S7', buildInputs({ loanAmount: null }), 'DECLINE'],
    ['S8', buildInputs({ currentLoanToValueRatio: null }), 'DECLINE'],
    // Missing-cashflow cases
    [
      'S9',
      buildInputs({
        currentLoanToValueRatio: 0.7,
        worstCaseLoanToValueRatio: null,
        yearEndCashBalance: null,
        isCashFlowDataMissing: true,
      }),
      'APPROVE',
    ],
    [
      'S10',
      buildInputs({
        currentLoanToValueRatio: 0.85,
        worstCaseLoanToValueRatio: null,
        yearEndCashBalance: null,
        isCashFlowDataMissing: true,
      }),
      'MANUALREVIEW',
    ],
    // Multi-factor cases
    [
      'M1',
      buildInputs({
        loanAmount: currency(900_000),
        currentLoanToValueRatio: 0.9,
        worstCaseLoanToValueRatio: 0.95,
      }),
      'MANUALREVIEW',
    ],
    [
      'M2',
      buildInputs({
        loanAmount: currency(900_000),
        currentLoanToValueRatio: 1.05,
        worstCaseLoanToValueRatio: 1.2,
      }),
      'DECLINE',
    ],
    [
      'M3',
      buildInputs({ worstCaseLoanToValueRatio: 1.1, yearEndCashBalance: currency(-5_000) }),
      'MANUALREVIEW',
    ],
    [
      'M4',
      buildInputs({
        loanAmount: currency(1_200_000),
        currentLoanToValueRatio: 0.92,
        worstCaseLoanToValueRatio: 1.3,
        yearEndCashBalance: currency(-50_000),
      }),
      'MANUALREVIEW',
    ],
    [
      'M5',
      buildInputs({
        loanAmount: null,
        currentLoanToValueRatio: 1.1,
        worstCaseLoanToValueRatio: 1.2,
        yearEndCashBalance: currency(-10_000),
      }),
      'DECLINE',
    ],
    // Boundary cases
    ['B1', buildInputs({ loanAmount: currency(750_000) }), 'APPROVE'],
    [
      'B2',
      buildInputs({ currentLoanToValueRatio: 0.8, worstCaseLoanToValueRatio: 0.85 }),
      'MANUALREVIEW',
    ],
    [
      'B3',
      buildInputs({ currentLoanToValueRatio: 1, worstCaseLoanToValueRatio: 1 }),
      'DECLINE',
    ],
    ['B4', buildInputs({ worstCaseLoanToValueRatio: 1 }), 'APPROVE'],
    // Ambiguous / open-question cases
    [
      'X1',
      buildInputs({
        loanAmount: currency(250_000),
        currentLoanToValueRatio: 0.45,
        worstCaseLoanToValueRatio: 0.45,
        yearEndCashBalance: currency(0),
      }),
      'APPROVE',
    ],
    [
      'X2',
      buildInputs({
        loanAmount: currency(400_000),
        currentLoanToValueRatio: 0.8,
        worstCaseLoanToValueRatio: null,
        yearEndCashBalance: null,
        isCashFlowDataMissing: true,
      }),
      'MANUALREVIEW',
    ],
  ])('%s -> %s', (_caseId, inputs, expectedOutcome) => {
    const { outcome } = service.computeSuggestedOutcome(
      inputs as RiskFlagSuggestionInputs,
    );

    expect(outcome).toBe(expectedOutcome);
  });

  it('reports every triggering reason for a multi-factor case, not just the first', () => {
    const { reasons } = service.computeSuggestedOutcome(
      buildInputs({
        loanAmount: currency(1_200_000),
        currentLoanToValueRatio: 0.92,
        worstCaseLoanToValueRatio: 1.3,
        yearEndCashBalance: currency(-50_000),
      }),
    );

    expect(reasons.map((reason) => reason.code)).toEqual(
      expect.arrayContaining([
        'LOAN_AMOUNT_OVER_THRESHOLD',
        'CURRENT_LTV_IN_REVIEW_BAND',
        'WORST_CASE_LTV_OVER_THRESHOLD',
        'YEAR_END_BALANCE_NEGATIVE',
      ]),
    );
  });

  it('does not soften a decline into a multi-reason review when a decline rule fires alongside review-only signals', () => {
    const { outcome, reasons } = service.computeSuggestedOutcome(
      buildInputs({
        loanAmount: currency(900_000),
        currentLoanToValueRatio: 1.05,
        worstCaseLoanToValueRatio: 1.2,
      }),
    );

    expect(outcome).toBe('DECLINE');
    expect(reasons).toHaveLength(1);
    expect(reasons[0].code).toBe('CURRENT_LTV_AT_OR_OVER_DECLINE_THRESHOLD');
  });
});
