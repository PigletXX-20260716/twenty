import { Injectable } from '@nestjs/common';

import { type CurrencyMetadata } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { buildFieldMapsFromFlatObjectMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-field-maps-from-flat-object-metadata.util';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';
import { OPPORTUNITY_OBJECT_NAME_SINGULAR } from 'src/modules/opportunity/query-hooks/opportunity-loan-to-value-ratio.service';
import { type CashFlowSeasonInputs } from 'src/modules/opportunity/query-hooks/opportunity-worst-case-loan-to-value-ratio.service';

export const AI_SUGGESTED_DECISION_FIELD_NAME = 'aiSuggestedDecision';
export const AI_SUGGESTED_TRIGGERING_FACTORS_FIELD_NAME =
  'aiSuggestedTriggeringFactors';
export const AI_SUGGESTED_RATIONALE_FIELD_NAME = 'aiSuggestedRationale';
export const OFFICER_DECISION_FIELD_NAME = 'officerDecision';
export const OFFICER_DECISION_RATIONALE_FIELD_NAME =
  'officerDecisionRationale';

// LTV/ratio fields store the raw fraction (0.8, not 80) - see
// opportunity-loan-to-value-ratio.service.ts for the same convention.
const CURRENT_LTV_REVIEW_THRESHOLD = 0.8;
const CURRENT_LTV_DECLINE_THRESHOLD = 1; // >=100% - confirmed with PM as Decline, not Manual Review
const WORST_CASE_LTV_REVIEW_THRESHOLD = 1; // >100% strictly - exactly 100% is Approve, confirmed with PM

// Currency fields store amountMicros (1 unit = 1_000_000 micros) - see
// opportunity-loan-to-value-ratio.service.ts for the same convention.
const MICROS_PER_UNIT = 1_000_000;
const LOAN_AMOUNT_REVIEW_THRESHOLD_MICROS = 750_000 * MICROS_PER_UNIT; // >$750k strictly - exactly $750k is Approve, confirmed with PM

export type RiskFlagOutcome = 'APPROVE' | 'MANUALREVIEW' | 'DECLINE';

export type RiskFlagReason = {
  code: string;
  message: string;
};

export type RiskFlagSuggestionInputs = {
  loanAmount: CurrencyMetadata | null | undefined;
  currentLoanToValueRatio: number | null | undefined;
  worstCaseLoanToValueRatio: number | null | undefined;
  yearEndCashBalance: CurrencyMetadata | null | undefined;
  isCashFlowDataMissing: boolean;
};

export type RiskFlagSuggestion = {
  outcome: RiskFlagOutcome;
  reasons: RiskFlagReason[];
};

const formatPercent = (ratio: number): string =>
  `${Math.round(ratio * 100)}%`;

const formatCurrency = (currency: CurrencyMetadata): string =>
  `$${Math.round(currency.amountMicros / MICROS_PER_UNIT).toLocaleString('en-US')}`;

@Injectable()
export class OpportunityRiskFlagSuggestionService {
  constructor(
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
  ) {}

  // Pure, deterministic, no AI involved - this is the single source of truth
  // for the outcome and the reasons that produced it. The rationale service
  // only turns `reasons` into prose after this has already fully decided.
  computeSuggestedOutcome(inputs: RiskFlagSuggestionInputs): RiskFlagSuggestion {
    const {
      loanAmount,
      currentLoanToValueRatio,
      worstCaseLoanToValueRatio,
      yearEndCashBalance,
      isCashFlowDataMissing,
    } = inputs;

    const declineReasons: RiskFlagReason[] = [];
    const reviewReasons: RiskFlagReason[] = [];

    if (!isDefined(loanAmount)) {
      declineReasons.push({
        code: 'LOAN_AMOUNT_MISSING',
        message: 'Loan amount is missing - cannot assess this loan without it.',
      });
    }

    if (!isDefined(currentLoanToValueRatio)) {
      declineReasons.push({
        code: 'CURRENT_LTV_MISSING',
        message:
          'Current loan-to-value ratio is missing - cannot assess loan risk without it.',
      });
    }

    if (
      isDefined(currentLoanToValueRatio) &&
      currentLoanToValueRatio >= CURRENT_LTV_DECLINE_THRESHOLD
    ) {
      declineReasons.push({
        code: 'CURRENT_LTV_AT_OR_OVER_DECLINE_THRESHOLD',
        message: `Current LTV of ${formatPercent(currentLoanToValueRatio)} means the farm's value would not cover the loan if it defaulted.`,
      });
    }

    if (
      isDefined(loanAmount) &&
      loanAmount.amountMicros > LOAN_AMOUNT_REVIEW_THRESHOLD_MICROS
    ) {
      reviewReasons.push({
        code: 'LOAN_AMOUNT_OVER_THRESHOLD',
        message: `Loan amount of ${formatCurrency(loanAmount)} exceeds the $750,000 manual-review threshold.`,
      });
    }

    if (
      isDefined(currentLoanToValueRatio) &&
      currentLoanToValueRatio >= CURRENT_LTV_REVIEW_THRESHOLD &&
      currentLoanToValueRatio < CURRENT_LTV_DECLINE_THRESHOLD
    ) {
      reviewReasons.push({
        code: 'CURRENT_LTV_IN_REVIEW_BAND',
        message: `Current LTV of ${formatPercent(currentLoanToValueRatio)} falls in the 80-100% manual-review band.`,
      });
    }

    if (
      isDefined(worstCaseLoanToValueRatio) &&
      worstCaseLoanToValueRatio > WORST_CASE_LTV_REVIEW_THRESHOLD
    ) {
      reviewReasons.push({
        code: 'WORST_CASE_LTV_OVER_THRESHOLD',
        message: `Worst-case LTV of ${formatPercent(worstCaseLoanToValueRatio)} (from the seasonal cash-flow trough) exceeds 100%.`,
      });
    }

    if (isDefined(yearEndCashBalance) && yearEndCashBalance.amountMicros < 0) {
      reviewReasons.push({
        code: 'YEAR_END_BALANCE_NEGATIVE',
        message: `Projected year-end cash balance is negative (${formatCurrency(yearEndCashBalance)}).`,
      });
    }

    if (
      isCashFlowDataMissing &&
      isDefined(currentLoanToValueRatio) &&
      currentLoanToValueRatio >= CURRENT_LTV_REVIEW_THRESHOLD
    ) {
      reviewReasons.push({
        code: 'CASH_FLOW_DATA_MISSING_AT_HIGH_LTV',
        message:
          'Seasonal cash-flow data is missing for a loan with LTV at or above 80% - the ability to float the loan through a seasonal trough cannot be assessed.',
      });
    }

    // Precedence: Decline > Manual Review > Approve.
    if (declineReasons.length > 0) {
      return { outcome: 'DECLINE', reasons: declineReasons };
    }

    if (reviewReasons.length > 0) {
      return { outcome: 'MANUALREVIEW', reasons: reviewReasons };
    }

    return {
      outcome: 'APPROVE',
      reasons: [
        {
          code: 'NO_CONCERNING_FACTORS',
          message: 'No inputs exceed risk thresholds.',
        },
      ],
    };
  }

  // Mirrors the completeness check inside calculateSeasonalTroughMicros in
  // opportunity-worst-case-loan-to-value-ratio.service.ts - update both if
  // the set of season inputs ever changes.
  isCashFlowDataMissing(seasonInputs: CashFlowSeasonInputs): boolean {
    const {
      startingCashBalance,
      springNetCashFlow,
      summerNetCashFlow,
      fallNetCashFlow,
      winterNetCashFlow,
    } = seasonInputs;

    return (
      !isDefined(startingCashBalance) ||
      !isDefined(springNetCashFlow) ||
      !isDefined(summerNetCashFlow) ||
      !isDefined(fallNetCashFlow) ||
      !isDefined(winterNetCashFlow)
    );
  }

  calculateYearEndCashBalance(
    seasonInputs: CashFlowSeasonInputs,
  ): CurrencyMetadata | null {
    if (this.isCashFlowDataMissing(seasonInputs)) {
      return null;
    }

    const {
      startingCashBalance,
      springNetCashFlow,
      summerNetCashFlow,
      fallNetCashFlow,
      winterNetCashFlow,
    } = seasonInputs as Record<keyof CashFlowSeasonInputs, CurrencyMetadata>;

    return {
      amountMicros:
        startingCashBalance.amountMicros +
        springNetCashFlow.amountMicros +
        summerNetCashFlow.amountMicros +
        fallNetCashFlow.amountMicros +
        winterNetCashFlow.amountMicros,
      currencyCode: startingCashBalance.currencyCode,
    };
  }

  async areRiskFlagFieldsEnabled(workspaceId: string): Promise<boolean> {
    const { flatObjectMetadataMaps, flatFieldMetadataMaps } =
      await this.flatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatObjectMetadataMaps', 'flatFieldMetadataMaps'],
        },
      );

    const { idByNameSingular } = buildObjectIdByNameMaps(
      flatObjectMetadataMaps,
    );
    const objectId = idByNameSingular[OPPORTUNITY_OBJECT_NAME_SINGULAR];
    const objectMetadata = objectId
      ? findFlatEntityByIdInFlatEntityMaps({
          flatEntityId: objectId,
          flatEntityMaps: flatObjectMetadataMaps,
        })
      : undefined;

    if (!isDefined(objectMetadata)) {
      return false;
    }

    const { fieldIdByName } = buildFieldMapsFromFlatObjectMetadata(
      flatFieldMetadataMaps,
      objectMetadata,
    );

    return (
      isDefined(fieldIdByName[AI_SUGGESTED_DECISION_FIELD_NAME]) &&
      isDefined(fieldIdByName[AI_SUGGESTED_TRIGGERING_FACTORS_FIELD_NAME]) &&
      isDefined(fieldIdByName[AI_SUGGESTED_RATIONALE_FIELD_NAME])
    );
  }
}
