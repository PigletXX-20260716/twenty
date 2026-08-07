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

// Trigger fields for the risk-flag rules engine + LLM rationale call - the
// recompute (and its LLM call) only fires when one of these is actually part
// of the update, so e.g. the officer's own decision Submit (which only
// touches AI_SUGGESTED_*/officerDecision* fields) doesn't re-trigger it.
const RISK_FLAG_TRIGGER_FIELD_NAMES = [
  'amount',
  FARM_PROPERTY_VALUE_FIELD_NAME,
  STARTING_CASH_BALANCE_FIELD_NAME,
  SPRING_NET_CASH_FLOW_FIELD_NAME,
  SUMMER_NET_CASH_FLOW_FIELD_NAME,
  FALL_NET_CASH_FLOW_FIELD_NAME,
  WINTER_NET_CASH_FLOW_FIELD_NAME,
];

@WorkspaceQueryHook(`opportunity.updateOne`)
export class OpportunityUpdateOnePreQueryHook implements WorkspacePreQueryHookInstance {
  constructor(
    private readonly opportunityLoanToValueRatioService: OpportunityLoanToValueRatioService,
    private readonly opportunityWorstCaseLoanToValueRatioService: OpportunityWorstCaseLoanToValueRatioService,
    private readonly opportunityRiskFlagSuggestionService: OpportunityRiskFlagSuggestionService,
    private readonly opportunityRiskFlagRationaleService: OpportunityRiskFlagRationaleService,
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
    let seasonInputs: CashFlowSeasonInputs = {
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

    if (worstCaseFieldsEnabled) {
      const existingCashFlowInputs =
        await this.opportunityWorstCaseLoanToValueRatioService.getExistingCashFlowInputs(
          {
            workspaceId: authContext.workspace.id,
            opportunityId: payload.id,
          },
        );

      seasonInputs = {
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

    const riskFlagFieldsEnabled =
      await this.opportunityRiskFlagSuggestionService.areRiskFlagFieldsEnabled(
        authContext.workspace.id,
      );

    const payloadTouchesTriggerField = RISK_FLAG_TRIGGER_FIELD_NAMES.some(
      (fieldName) => isDefined(payload.data[fieldName]),
    );

    let riskFlagData: Record<string, unknown> = {};

    if (riskFlagFieldsEnabled && payloadTouchesTriggerField) {
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
