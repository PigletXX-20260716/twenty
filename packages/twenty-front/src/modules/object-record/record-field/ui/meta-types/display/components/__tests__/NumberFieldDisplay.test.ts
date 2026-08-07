import {
  getLoanToValueRatioTooltipContent,
  getWorstCaseLoanToValueRatioTooltipContent,
} from '@/object-record/record-field/ui/meta-types/display/components/NumberFieldDisplay';

describe('getLoanToValueRatioTooltipContent', () => {
  it('returns null for a non-LTV number field', () => {
    expect(
      getLoanToValueRatioTooltipContent({
        isLoanToValueRatio: false,
        isHighLoanToValueRatio: false,
        isDisplayInRecordTable: true,
      }),
    ).toBeNull();
  });

  it('returns null in the table when the ratio is not high, to avoid a tooltip on every row', () => {
    expect(
      getLoanToValueRatioTooltipContent({
        isLoanToValueRatio: true,
        isHighLoanToValueRatio: false,
        isDisplayInRecordTable: true,
      }),
    ).toBeNull();
  });

  it('returns the short risk message in the table when the ratio is high', () => {
    const result = getLoanToValueRatioTooltipContent({
      isLoanToValueRatio: true,
      isHighLoanToValueRatio: true,
      isDisplayInRecordTable: true,
    });

    expect(result).toContain('high risk');
  });

  it('returns the full explainer outside the table, even when the ratio is not high', () => {
    const result = getLoanToValueRatioTooltipContent({
      isLoanToValueRatio: true,
      isHighLoanToValueRatio: false,
      isDisplayInRecordTable: false,
    });

    expect(result).toContain('Loan-to-Value Ratio = Loan Amount');
  });

  it('returns the full explainer outside the table when the ratio is high', () => {
    const result = getLoanToValueRatioTooltipContent({
      isLoanToValueRatio: true,
      isHighLoanToValueRatio: true,
      isDisplayInRecordTable: false,
    });

    expect(result).toContain('Loan-to-Value Ratio = Loan Amount');
  });

  it('defaults to the full explainer when isDisplayInRecordTable is not set', () => {
    const result = getLoanToValueRatioTooltipContent({
      isLoanToValueRatio: true,
      isHighLoanToValueRatio: false,
    });

    expect(result).toContain('Loan-to-Value Ratio = Loan Amount');
  });
});

describe('getWorstCaseLoanToValueRatioTooltipContent', () => {
  it('returns null for a non-worst-case-LTV number field', () => {
    expect(
      getWorstCaseLoanToValueRatioTooltipContent({
        isWorstCaseLoanToValueRatio: false,
        isHighWorstCaseLoanToValueRatio: false,
        isDisplayInRecordTable: true,
        troughData: null,
      }),
    ).toBeNull();
  });

  it('returns null in the table when the ratio is not high, to avoid a tooltip on every row', () => {
    expect(
      getWorstCaseLoanToValueRatioTooltipContent({
        isWorstCaseLoanToValueRatio: true,
        isHighWorstCaseLoanToValueRatio: false,
        isDisplayInRecordTable: true,
        troughData: null,
      }),
    ).toBeNull();
  });

  it('returns the short risk message in the table when the ratio is high', () => {
    const result = getWorstCaseLoanToValueRatioTooltipContent({
      isWorstCaseLoanToValueRatio: true,
      isHighWorstCaseLoanToValueRatio: true,
      isDisplayInRecordTable: true,
      troughData: null,
    });

    expect(result).toContain('worth investigating');
  });

  it('falls back to a formula-only sentence when trough data is missing', () => {
    const result = getWorstCaseLoanToValueRatioTooltipContent({
      isWorstCaseLoanToValueRatio: true,
      isHighWorstCaseLoanToValueRatio: true,
      isDisplayInRecordTable: false,
      troughData: null,
    });

    expect(result).toContain('Worst-Case LTV = (Loan Amount');
    expect(result).not.toContain('largest projected shortfall');
  });

  it('names "the start of the year" when the trough is at the starting balance', () => {
    const result = getWorstCaseLoanToValueRatioTooltipContent({
      isWorstCaseLoanToValueRatio: true,
      isHighWorstCaseLoanToValueRatio: true,
      isDisplayInRecordTable: false,
      troughData: {
        troughLabel: 'Start',
        isTroughAtStart: true,
        shortfallAmount: 10_000,
        worstCaseLoanAmount: 210_000,
        currencyCode: 'USD',
      },
    });

    expect(result).toContain('at the start of the year');
    expect(result).not.toContain('at end of');
  });

  it('names the season when the trough occurs mid-year', () => {
    const result = getWorstCaseLoanToValueRatioTooltipContent({
      isWorstCaseLoanToValueRatio: true,
      isHighWorstCaseLoanToValueRatio: true,
      isDisplayInRecordTable: false,
      troughData: {
        troughLabel: 'Winter',
        isTroughAtStart: false,
        shortfallAmount: 30_000,
        worstCaseLoanAmount: 210_000,
        currencyCode: 'USD',
      },
    });

    expect(result).toContain('at end of Winter');
  });
});
