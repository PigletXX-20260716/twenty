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
import { OpportunityRiskFlagRationaleService } from 'src/modules/opportunity/query-hooks/opportunity-risk-flag-rationale.service';
import {
  AI_SUGGESTED_DECISION_FIELD_NAME,
  AI_SUGGESTED_RATIONALE_FIELD_NAME,
  AI_SUGGESTED_TRIGGERING_FACTORS_FIELD_NAME,
  OpportunityRiskFlagSuggestionService,
} from 'src/modules/opportunity/query-hooks/opportunity-risk-flag-suggestion.service';
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

@WorkspaceQueryHook(`opportunity.createOne`)
export class OpportunityCreateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly opportunityLoanToValueRatioService: OpportunityLoanToValueRatioService,
    private readonly opportunityWorstCaseLoanToValueRatioService: OpportunityWorstCaseLoanToValueRatioService,
    private readonly opportunityRiskFlagSuggestionService: OpportunityRiskFlagSuggestionService,
    private readonly opportunityRiskFlagRationaleService: OpportunityRiskFlagRationaleService,
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

    const seasonInputs: CashFlowSeasonInputs = {
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
    };

    const worstCaseFieldsEnabled =
      await this.opportunityWorstCaseLoanToValueRatioService.areWorstCaseLoanToValueFieldsEnabled(
        authContext.workspace.id,
      );

    const worstCaseLoanToValueRatio = worstCaseFieldsEnabled
      ? this.opportunityWorstCaseLoanToValueRatioService.calculateWorstCaseLoanToValueRatio(
          loanAmount,
          farmPropertyValue,
          seasonInputs,
        )
      : null;

    const riskFlagFieldsEnabled =
      await this.opportunityRiskFlagSuggestionService.areRiskFlagFieldsEnabled(
        authContext.workspace.id,
      );

    let riskFlagData: Record<string, unknown> = {};

    if (riskFlagFieldsEnabled) {
      const yearEndCashBalance =
        this.opportunityRiskFlagSuggestionService.calculateYearEndCashBalance(
          seasonInputs,
        );
      const isCashFlowDataMissing =
        this.opportunityRiskFlagSuggestionService.isCashFlowDataMissing(
          seasonInputs,
        );

      const suggestion =
        this.opportunityRiskFlagSuggestionService.computeSuggestedOutcome({
          loanAmount,
          currentLoanToValueRatio: loanToValueRatio,
          worstCaseLoanToValueRatio,
          yearEndCashBalance,
          isCashFlowDataMissing,
        });

      const rationale =
        await this.opportunityRiskFlagRationaleService.generateRationale({
          outcome: suggestion.outcome,
          reasons: suggestion.reasons,
          loanAmount,
          currentLoanToValueRatio: loanToValueRatio,
          worstCaseLoanToValueRatio,
          yearEndCashBalance,
        });

      riskFlagData = {
        [AI_SUGGESTED_DECISION_FIELD_NAME]: suggestion.outcome,
        [AI_SUGGESTED_TRIGGERING_FACTORS_FIELD_NAME]: suggestion.reasons
          .map((reason) => reason.message)
          .join('\n'),
        [AI_SUGGESTED_RATIONALE_FIELD_NAME]: rationale,
      };
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
        ...riskFlagData,
      },
    };
  }
}
