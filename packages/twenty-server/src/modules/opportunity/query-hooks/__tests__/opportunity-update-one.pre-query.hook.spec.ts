import { Test, type TestingModule } from '@nestjs/testing';

import { type UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { OpportunityLoanToValueRatioService } from 'src/modules/opportunity/query-hooks/opportunity-loan-to-value-ratio.service';
import { OpportunityUpdateOnePreQueryHook } from 'src/modules/opportunity/query-hooks/opportunity-update-one.pre-query.hook';
import { OpportunityWorstCaseLoanToValueRatioService } from 'src/modules/opportunity/query-hooks/opportunity-worst-case-loan-to-value-ratio.service';

describe('OpportunityUpdateOnePreQueryHook', () => {
  let hook: OpportunityUpdateOnePreQueryHook;
  let areLoanToValueFieldsEnabled: jest.Mock;
  let getExistingLoanAmountAndFarmPropertyValue: jest.Mock;
  let validateLoanToValueInputsOrThrow: jest.Mock;
  let calculateLoanToValueRatio: jest.Mock;
  let areWorstCaseLoanToValueFieldsEnabled: jest.Mock;
  let getExistingCashFlowInputs: jest.Mock;
  let calculateWorstCaseLoanToValueRatio: jest.Mock;

  const authContext = {
    type: 'system',
    workspace: { id: 'workspace-id' },
  } as unknown as WorkspaceAuthContext;

  beforeEach(async () => {
    areLoanToValueFieldsEnabled = jest.fn();
    getExistingLoanAmountAndFarmPropertyValue = jest.fn();
    validateLoanToValueInputsOrThrow = jest.fn();
    calculateLoanToValueRatio = jest.fn();
    areWorstCaseLoanToValueFieldsEnabled = jest.fn().mockResolvedValue(false);
    getExistingCashFlowInputs = jest.fn().mockResolvedValue({
      startingCashBalance: null,
      springNetCashFlow: null,
      summerNetCashFlow: null,
      fallNetCashFlow: null,
      winterNetCashFlow: null,
    });
    calculateWorstCaseLoanToValueRatio = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunityUpdateOnePreQueryHook,
        {
          provide: OpportunityLoanToValueRatioService,
          useValue: {
            areLoanToValueFieldsEnabled,
            getExistingLoanAmountAndFarmPropertyValue,
            validateLoanToValueInputsOrThrow,
            calculateLoanToValueRatio,
          },
        },
        {
          provide: OpportunityWorstCaseLoanToValueRatioService,
          useValue: {
            areWorstCaseLoanToValueFieldsEnabled,
            getExistingCashFlowInputs,
            calculateWorstCaseLoanToValueRatio,
          },
        },
      ],
    }).compile();

    hook = module.get<OpportunityUpdateOnePreQueryHook>(
      OpportunityUpdateOnePreQueryHook,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops when the workspace does not have the custom fields (e.g. YCombinator)', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(false);

    const payload: UpdateOneResolverArgs = {
      id: 'opportunity-id',
      data: { farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' } },
    };

    const result = await hook.execute(authContext, 'opportunity', payload);

    expect(result).toBe(payload);
    expect(getExistingLoanAmountAndFarmPropertyValue).not.toHaveBeenCalled();
    expect(calculateLoanToValueRatio).not.toHaveBeenCalled();
  });

  it('falls back to the existing value for a field not present in the payload', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    getExistingLoanAmountAndFarmPropertyValue.mockResolvedValue({
      loanAmount: { amountMicros: 150, currencyCode: 'USD' },
      farmPropertyValue: null,
    });
    calculateLoanToValueRatio.mockReturnValue(0.75);

    const payload: UpdateOneResolverArgs = {
      id: 'opportunity-id',
      data: { farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' } },
    };

    const result = await hook.execute(authContext, 'opportunity', payload);

    expect(calculateLoanToValueRatio).toHaveBeenCalledWith(
      { amountMicros: 150, currencyCode: 'USD' },
      { amountMicros: 200, currencyCode: 'USD' },
    );
    expect(result.data.loanToValueRatio).toBe(0.75);
  });

  it('overwrites a client-supplied loanToValueRatio with the computed value', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    getExistingLoanAmountAndFarmPropertyValue.mockResolvedValue({
      loanAmount: { amountMicros: 150, currencyCode: 'USD' },
      farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' },
    });
    calculateLoanToValueRatio.mockReturnValue(null);

    const payload: UpdateOneResolverArgs = {
      id: 'opportunity-id',
      data: { loanToValueRatio: 999 },
    };

    const result = await hook.execute(authContext, 'opportunity', payload);

    expect(result.data.loanToValueRatio).toBeNull();
  });

  it('propagates the error and does not compute a ratio when validation throws', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    getExistingLoanAmountAndFarmPropertyValue.mockResolvedValue({
      loanAmount: { amountMicros: -150, currencyCode: 'USD' },
      farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' },
    });
    validateLoanToValueInputsOrThrow.mockImplementation(() => {
      throw new Error('Loan amount cannot be negative');
    });

    const payload: UpdateOneResolverArgs = {
      id: 'opportunity-id',
      data: {},
    };

    await expect(
      hook.execute(authContext, 'opportunity', payload),
    ).rejects.toThrow('Loan amount cannot be negative');
    expect(calculateLoanToValueRatio).not.toHaveBeenCalled();
  });

  it('does not inject worstCaseLoanToValueRatio when the workspace lacks the cash-flow fields', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    getExistingLoanAmountAndFarmPropertyValue.mockResolvedValue({
      loanAmount: { amountMicros: 150, currencyCode: 'USD' },
      farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' },
    });
    calculateLoanToValueRatio.mockReturnValue(0.75);
    areWorstCaseLoanToValueFieldsEnabled.mockResolvedValue(false);

    const payload: UpdateOneResolverArgs = {
      id: 'opportunity-id',
      data: { farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' } },
    };

    const result = await hook.execute(authContext, 'opportunity', payload);

    expect(getExistingCashFlowInputs).not.toHaveBeenCalled();
    expect(calculateWorstCaseLoanToValueRatio).not.toHaveBeenCalled();
    expect('worstCaseLoanToValueRatio' in result.data).toBe(false);
  });

  it('merges a payload-supplied season field over the existing DB value for the rest, when computing worst-case LTV', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    getExistingLoanAmountAndFarmPropertyValue.mockResolvedValue({
      loanAmount: { amountMicros: 180_000_000_000, currencyCode: 'USD' },
      farmPropertyValue: { amountMicros: 200_000_000_000, currencyCode: 'USD' },
    });
    calculateLoanToValueRatio.mockReturnValue(0.9);
    areWorstCaseLoanToValueFieldsEnabled.mockResolvedValue(true);
    getExistingCashFlowInputs.mockResolvedValue({
      startingCashBalance: { amountMicros: 0, currencyCode: 'USD' },
      springNetCashFlow: { amountMicros: 10_000_000_000, currencyCode: 'USD' },
      summerNetCashFlow: { amountMicros: 50_000_000_000, currencyCode: 'USD' },
      fallNetCashFlow: { amountMicros: -20_000_000_000, currencyCode: 'USD' },
      winterNetCashFlow: { amountMicros: -50_000_000_000, currencyCode: 'USD' },
    });
    calculateWorstCaseLoanToValueRatio.mockReturnValue(1.05);

    const payload: UpdateOneResolverArgs = {
      id: 'opportunity-id',
      // Only winterNetCashFlow is being edited in this request.
      data: {
        winterNetCashFlow: {
          amountMicros: -70_000_000_000,
          currencyCode: 'USD',
        },
      },
    };

    const result = await hook.execute(authContext, 'opportunity', payload);

    expect(calculateWorstCaseLoanToValueRatio).toHaveBeenCalledWith(
      { amountMicros: 180_000_000_000, currencyCode: 'USD' },
      { amountMicros: 200_000_000_000, currencyCode: 'USD' },
      {
        startingCashBalance: { amountMicros: 0, currencyCode: 'USD' },
        springNetCashFlow: {
          amountMicros: 10_000_000_000,
          currencyCode: 'USD',
        },
        summerNetCashFlow: {
          amountMicros: 50_000_000_000,
          currencyCode: 'USD',
        },
        fallNetCashFlow: { amountMicros: -20_000_000_000, currencyCode: 'USD' },
        winterNetCashFlow: {
          amountMicros: -70_000_000_000,
          currencyCode: 'USD',
        },
      },
    );
    expect(result.data.worstCaseLoanToValueRatio).toBe(1.05);
  });

  it('overwrites a client-supplied worstCaseLoanToValueRatio with the computed value', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    getExistingLoanAmountAndFarmPropertyValue.mockResolvedValue({
      loanAmount: { amountMicros: 150, currencyCode: 'USD' },
      farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' },
    });
    calculateLoanToValueRatio.mockReturnValue(0.75);
    areWorstCaseLoanToValueFieldsEnabled.mockResolvedValue(true);
    calculateWorstCaseLoanToValueRatio.mockReturnValue(null);

    const payload: UpdateOneResolverArgs = {
      id: 'opportunity-id',
      data: { worstCaseLoanToValueRatio: 999 },
    };

    const result = await hook.execute(authContext, 'opportunity', payload);

    expect(result.data.worstCaseLoanToValueRatio).toBeNull();
  });

  it('leaves an officer action note untouched when present', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    getExistingLoanAmountAndFarmPropertyValue.mockResolvedValue({
      loanAmount: { amountMicros: 150, currencyCode: 'USD' },
      farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' },
    });
    calculateLoanToValueRatio.mockReturnValue(0.75);
    areWorstCaseLoanToValueFieldsEnabled.mockResolvedValue(false);

    const payload: UpdateOneResolverArgs = {
      id: 'opportunity-id',
      data: {
        worstCaseLtvActionNote:
          'Called the customer, confirmed normal calving-season dip.',
      },
    };

    const result = await hook.execute(authContext, 'opportunity', payload);

    expect(result.data.worstCaseLtvActionNote).toBe(
      'Called the customer, confirmed normal calving-season dip.',
    );
  });
});
