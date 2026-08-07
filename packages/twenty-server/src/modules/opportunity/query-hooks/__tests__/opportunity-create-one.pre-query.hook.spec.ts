import { Test, type TestingModule } from '@nestjs/testing';

import { type CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { OpportunityCreateOnePreQueryHook } from 'src/modules/opportunity/query-hooks/opportunity-create-one.pre-query.hook';
import { OpportunityLoanToValueRatioService } from 'src/modules/opportunity/query-hooks/opportunity-loan-to-value-ratio.service';
import { OpportunityWorstCaseLoanToValueRatioService } from 'src/modules/opportunity/query-hooks/opportunity-worst-case-loan-to-value-ratio.service';

describe('OpportunityCreateOnePreQueryHook', () => {
  let hook: OpportunityCreateOnePreQueryHook;
  let areLoanToValueFieldsEnabled: jest.Mock;
  let validateLoanToValueInputsOrThrow: jest.Mock;
  let calculateLoanToValueRatio: jest.Mock;
  let areWorstCaseLoanToValueFieldsEnabled: jest.Mock;
  let calculateWorstCaseLoanToValueRatio: jest.Mock;

  const authContext = {
    type: 'system',
    workspace: { id: 'workspace-id' },
  } as unknown as WorkspaceAuthContext;

  beforeEach(async () => {
    areLoanToValueFieldsEnabled = jest.fn();
    validateLoanToValueInputsOrThrow = jest.fn();
    calculateLoanToValueRatio = jest.fn();
    areWorstCaseLoanToValueFieldsEnabled = jest.fn().mockResolvedValue(false);
    calculateWorstCaseLoanToValueRatio = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunityCreateOnePreQueryHook,
        {
          provide: OpportunityLoanToValueRatioService,
          useValue: {
            areLoanToValueFieldsEnabled,
            validateLoanToValueInputsOrThrow,
            calculateLoanToValueRatio,
          },
        },
        {
          provide: OpportunityWorstCaseLoanToValueRatioService,
          useValue: {
            areWorstCaseLoanToValueFieldsEnabled,
            calculateWorstCaseLoanToValueRatio,
          },
        },
      ],
    }).compile();

    hook = module.get<OpportunityCreateOnePreQueryHook>(
      OpportunityCreateOnePreQueryHook,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('no-ops when the workspace does not have the custom fields', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(false);

    const payload: CreateOneResolverArgs = {
      data: { amount: { amountMicros: 100, currencyCode: 'USD' } },
    };

    const result = await hook.execute(authContext, 'opportunity', payload);

    expect(result).toBe(payload);
    expect(calculateLoanToValueRatio).not.toHaveBeenCalled();
  });

  it('injects the computed ratio, overwriting any client-supplied value', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    calculateLoanToValueRatio.mockReturnValue(0.75);

    const payload: CreateOneResolverArgs = {
      data: {
        amount: { amountMicros: 150, currencyCode: 'USD' },
        farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' },
        loanToValueRatio: 999,
      },
    };

    const result = await hook.execute(authContext, 'opportunity', payload);

    expect(validateLoanToValueInputsOrThrow).toHaveBeenCalledWith(
      { amountMicros: 150, currencyCode: 'USD' },
      { amountMicros: 200, currencyCode: 'USD' },
    );
    expect(calculateLoanToValueRatio).toHaveBeenCalledWith(
      { amountMicros: 150, currencyCode: 'USD' },
      { amountMicros: 200, currencyCode: 'USD' },
    );
    expect(result.data.loanToValueRatio).toBe(0.75);
  });

  it('propagates the error and does not compute a ratio when validation throws', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    validateLoanToValueInputsOrThrow.mockImplementation(() => {
      throw new Error('Loan amount cannot be negative');
    });

    const payload: CreateOneResolverArgs = {
      data: {
        amount: { amountMicros: -150, currencyCode: 'USD' },
        farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' },
      },
    };

    await expect(
      hook.execute(authContext, 'opportunity', payload),
    ).rejects.toThrow('Loan amount cannot be negative');
    expect(calculateLoanToValueRatio).not.toHaveBeenCalled();
  });

  it('does not inject worstCaseLoanToValueRatio when the workspace lacks the cash-flow fields', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    calculateLoanToValueRatio.mockReturnValue(0.75);
    areWorstCaseLoanToValueFieldsEnabled.mockResolvedValue(false);

    const payload: CreateOneResolverArgs = {
      data: {
        amount: { amountMicros: 150, currencyCode: 'USD' },
        farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' },
      },
    };

    const result = await hook.execute(authContext, 'opportunity', payload);

    expect(calculateWorstCaseLoanToValueRatio).not.toHaveBeenCalled();
    expect('worstCaseLoanToValueRatio' in result.data).toBe(false);
  });

  it('injects the computed worstCaseLoanToValueRatio, overwriting any client-supplied value', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    calculateLoanToValueRatio.mockReturnValue(0.9);
    areWorstCaseLoanToValueFieldsEnabled.mockResolvedValue(true);
    calculateWorstCaseLoanToValueRatio.mockReturnValue(1.05);

    const payload: CreateOneResolverArgs = {
      data: {
        amount: { amountMicros: 180_000_000_000, currencyCode: 'USD' },
        farmPropertyValue: {
          amountMicros: 200_000_000_000,
          currencyCode: 'USD',
        },
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
        worstCaseLoanToValueRatio: 999,
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

  it('leaves an officer action note untouched when present', async () => {
    areLoanToValueFieldsEnabled.mockResolvedValue(true);
    calculateLoanToValueRatio.mockReturnValue(0.75);
    areWorstCaseLoanToValueFieldsEnabled.mockResolvedValue(false);

    const payload: CreateOneResolverArgs = {
      data: {
        amount: { amountMicros: 150, currencyCode: 'USD' },
        farmPropertyValue: { amountMicros: 200, currencyCode: 'USD' },
        worstCaseLtvActionNote:
          'Confirmed normal seasonal pattern with the customer.',
      },
    };

    const result = await hook.execute(authContext, 'opportunity', payload);

    expect(result.data.worstCaseLtvActionNote).toBe(
      'Confirmed normal seasonal pattern with the customer.',
    );
  });
});
