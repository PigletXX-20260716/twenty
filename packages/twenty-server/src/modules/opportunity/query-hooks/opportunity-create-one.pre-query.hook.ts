import { type CurrencyMetadata } from 'twenty-shared/types';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import {
  FARM_PROPERTY_VALUE_FIELD_NAME,
  LOAN_TO_VALUE_RATIO_FIELD_NAME,
  OpportunityLoanToValueRatioService,
} from 'src/modules/opportunity/query-hooks/opportunity-loan-to-value-ratio.service';
import {
  FALL_NET_CASH_FLOW_FIELD_NAME,
  SPRING_NET_CASH_FLOW_FIELD_NAME,
  STARTING_CASH_BALANCE_FIELD_NAME,
  SUMMER_NET_CASH_FLOW_FIELD_NAME,
  WINTER_NET_CASH_FLOW_FIELD_NAME,
  WORST_CASE_LOAN_TO_VALUE_RATIO_FIELD_NAME,
  OpportunityWorstCaseLoanToValueRatioService,
} from 'src/modules/opportunity/query-hooks/opportunity-worst-case-loan-to-value-ratio.service';

@WorkspaceQueryHook(`opportunity.createOne`)
export class OpportunityCreateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly opportunityLoanToValueRatioService: OpportunityLoanToValueRatioService,
    private readonly opportunityWorstCaseLoanToValueRatioService: OpportunityWorstCaseLoanToValueRatioService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: CreateOneResolverArgs,
  ): Promise<CreateOneResolverArgs> {
    const fieldsEnabled =
      await this.opportunityLoanToValueRatioService.areLoanToValueFieldsEnabled(
        authContext.workspace.id,
      );

    if (!fieldsEnabled) {
      return payload;
    }

    const loanAmount = payload.data.amount as CurrencyMetadata | null;
    const farmPropertyValue = payload.data[
      FARM_PROPERTY_VALUE_FIELD_NAME
    ] as CurrencyMetadata | null;

    this.opportunityLoanToValueRatioService.validateLoanToValueInputsOrThrow(
      loanAmount,
      farmPropertyValue,
    );

    const loanToValueRatio =
      this.opportunityLoanToValueRatioService.calculateLoanToValueRatio(
        loanAmount,
        farmPropertyValue,
      );

    const worstCaseFieldsEnabled =
      await this.opportunityWorstCaseLoanToValueRatioService.areWorstCaseLoanToValueFieldsEnabled(
        authContext.workspace.id,
      );

    const worstCaseLoanToValueRatio = worstCaseFieldsEnabled
      ? this.opportunityWorstCaseLoanToValueRatioService.calculateWorstCaseLoanToValueRatio(
          loanAmount,
          farmPropertyValue,
          {
            startingCashBalance: payload.data[
              STARTING_CASH_BALANCE_FIELD_NAME
            ] as CurrencyMetadata | null,
            springNetCashFlow: payload.data[
              SPRING_NET_CASH_FLOW_FIELD_NAME
            ] as CurrencyMetadata | null,
            summerNetCashFlow: payload.data[
              SUMMER_NET_CASH_FLOW_FIELD_NAME
            ] as CurrencyMetadata | null,
            fallNetCashFlow: payload.data[
              FALL_NET_CASH_FLOW_FIELD_NAME
            ] as CurrencyMetadata | null,
            winterNetCashFlow: payload.data[
              WINTER_NET_CASH_FLOW_FIELD_NAME
            ] as CurrencyMetadata | null,
          },
        )
      : null;

    return {
      ...payload,
      data: {
        ...payload.data,
        [LOAN_TO_VALUE_RATIO_FIELD_NAME]: loanToValueRatio,
        ...(worstCaseFieldsEnabled
          ? {
              [WORST_CASE_LOAN_TO_VALUE_RATIO_FIELD_NAME]:
                worstCaseLoanToValueRatio,
            }
          : {}),
      },
    };
  }
}
