import { type CurrencyMetadata } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { type WorkspacePreQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { type UpdateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

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
  type CashFlowSeasonInputs,
} from 'src/modules/opportunity/query-hooks/opportunity-worst-case-loan-to-value-ratio.service';

@WorkspaceQueryHook(`opportunity.updateOne`)
export class OpportunityUpdateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly opportunityLoanToValueRatioService: OpportunityLoanToValueRatioService,
    private readonly opportunityWorstCaseLoanToValueRatioService: OpportunityWorstCaseLoanToValueRatioService,
  ) {}

  async execute(
    authContext: WorkspaceAuthContext,
    _objectName: string,
    payload: UpdateOneResolverArgs,
  ): Promise<UpdateOneResolverArgs> {
    const fieldsEnabled =
      await this.opportunityLoanToValueRatioService.areLoanToValueFieldsEnabled(
        authContext.workspace.id,
      );

    if (!fieldsEnabled) {
      return payload;
    }

    const {
      loanAmount: existingLoanAmount,
      farmPropertyValue: existingFarmPropertyValue,
    } =
      await this.opportunityLoanToValueRatioService.getExistingLoanAmountAndFarmPropertyValue(
        {
          workspaceId: authContext.workspace.id,
          opportunityId: payload.id,
        },
      );

    const loanAmount = isDefined(payload.data.amount)
      ? (payload.data.amount as CurrencyMetadata | null)
      : existingLoanAmount;
    const farmPropertyValue = isDefined(
      payload.data[FARM_PROPERTY_VALUE_FIELD_NAME],
    )
      ? (payload.data[
          FARM_PROPERTY_VALUE_FIELD_NAME
        ] as CurrencyMetadata | null)
      : existingFarmPropertyValue;

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

    let worstCaseLoanToValueRatio: number | null = null;

    if (worstCaseFieldsEnabled) {
      const existingCashFlowInputs =
        await this.opportunityWorstCaseLoanToValueRatioService.getExistingCashFlowInputs(
          {
            workspaceId: authContext.workspace.id,
            opportunityId: payload.id,
          },
        );

      const seasonInputs: CashFlowSeasonInputs = {
        startingCashBalance: isDefined(
          payload.data[STARTING_CASH_BALANCE_FIELD_NAME],
        )
          ? (payload.data[
              STARTING_CASH_BALANCE_FIELD_NAME
            ] as CurrencyMetadata | null)
          : existingCashFlowInputs.startingCashBalance,
        springNetCashFlow: isDefined(
          payload.data[SPRING_NET_CASH_FLOW_FIELD_NAME],
        )
          ? (payload.data[
              SPRING_NET_CASH_FLOW_FIELD_NAME
            ] as CurrencyMetadata | null)
          : existingCashFlowInputs.springNetCashFlow,
        summerNetCashFlow: isDefined(
          payload.data[SUMMER_NET_CASH_FLOW_FIELD_NAME],
        )
          ? (payload.data[
              SUMMER_NET_CASH_FLOW_FIELD_NAME
            ] as CurrencyMetadata | null)
          : existingCashFlowInputs.summerNetCashFlow,
        fallNetCashFlow: isDefined(payload.data[FALL_NET_CASH_FLOW_FIELD_NAME])
          ? (payload.data[
              FALL_NET_CASH_FLOW_FIELD_NAME
            ] as CurrencyMetadata | null)
          : existingCashFlowInputs.fallNetCashFlow,
        winterNetCashFlow: isDefined(
          payload.data[WINTER_NET_CASH_FLOW_FIELD_NAME],
        )
          ? (payload.data[
              WINTER_NET_CASH_FLOW_FIELD_NAME
            ] as CurrencyMetadata | null)
          : existingCashFlowInputs.winterNetCashFlow,
      };

      worstCaseLoanToValueRatio =
        this.opportunityWorstCaseLoanToValueRatioService.calculateWorstCaseLoanToValueRatio(
          loanAmount,
          farmPropertyValue,
          seasonInputs,
        );
    }

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
