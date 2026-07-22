import { getLoanToValueRatioTooltipContent } from '@/object-record/record-field/ui/meta-types/display/components/NumberFieldDisplay';

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
