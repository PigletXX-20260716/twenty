import { Injectable } from '@nestjs/common';

import { type CurrencyMetadata } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { buildFieldMapsFromFlatObjectMetadata } from 'src/engine/metadata-modules/flat-field-metadata/utils/build-field-maps-from-flat-object-metadata.util';
import { buildObjectIdByNameMaps } from 'src/engine/metadata-modules/flat-object-metadata/utils/build-object-id-by-name-maps.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  FARM_PROPERTY_VALUE_FIELD_NAME,
  LOAN_TO_VALUE_RATIO_FIELD_NAME,
  OPPORTUNITY_OBJECT_NAME_SINGULAR,
  OpportunityLoanToValueRatioService,
} from 'src/modules/opportunity/query-hooks/opportunity-loan-to-value-ratio.service';
import { type OpportunityWorkspaceEntity } from 'src/modules/opportunity/standard-objects/opportunity.workspace-entity';

export const WORST_CASE_LOAN_TO_VALUE_RATIO_FIELD_NAME =
  'worstCaseLoanToValueRatio';
export const STARTING_CASH_BALANCE_FIELD_NAME = 'startingCashBalance';
export const SPRING_NET_CASH_FLOW_FIELD_NAME = 'springNetCashFlow';
export const SUMMER_NET_CASH_FLOW_FIELD_NAME = 'summerNetCashFlow';
export const FALL_NET_CASH_FLOW_FIELD_NAME = 'fallNetCashFlow';
export const WINTER_NET_CASH_FLOW_FIELD_NAME = 'winterNetCashFlow';

// Above this baseline LTV, seasonal cash-flow risk is worth accounting for on
// top of the point-in-time ratio.
const BASELINE_LOAN_TO_VALUE_THRESHOLD = 0.8;

// Percentage NUMBER fields store the raw fraction (0.5, not 50) - see
// opportunity-loan-to-value-ratio.service.ts for the same convention.
const RATIO_ROUNDING_FACTOR = 1_000_000;

export type CashFlowSeasonInputs = {
  startingCashBalance: CurrencyMetadata | null | undefined;
  springNetCashFlow: CurrencyMetadata | null | undefined;
  summerNetCashFlow: CurrencyMetadata | null | undefined;
  fallNetCashFlow: CurrencyMetadata | null | undefined;
  winterNetCashFlow: CurrencyMetadata | null | undefined;
};

@Injectable()
export class OpportunityWorstCaseLoanToValueRatioService {
  constructor(
    private readonly flatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
    private readonly opportunityLoanToValueRatioService: OpportunityLoanToValueRatioService,
  ) {}

  // Mirrors the trough-finding reduce in
  // packages/twenty-front/src/modules/page-layout/widgets/cash-flow/utils/computeCashFlowSeries.ts
  // (kept minimal and duplicated - the server only needs the trough value,
  // not the full chart series - update both if the algorithm changes).
  // Operates directly in amountMicros, since the trough sign/comparison is
  // scale-invariant and every input here already shares that unit.
  private calculateSeasonalTroughMicros(
    seasonInputs: CashFlowSeasonInputs,
  ): number | null {
    const {
      startingCashBalance,
      springNetCashFlow,
      summerNetCashFlow,
      fallNetCashFlow,
      winterNetCashFlow,
    } = seasonInputs;

    if (
      !isDefined(startingCashBalance) ||
      !isDefined(springNetCashFlow) ||
      !isDefined(summerNetCashFlow) ||
      !isDefined(fallNetCashFlow) ||
      !isDefined(winterNetCashFlow)
    ) {
      return null;
    }

    let runningBalanceMicros = startingCashBalance.amountMicros;
    let troughMicros = runningBalanceMicros;

    for (const seasonNet of [
      springNetCashFlow,
      summerNetCashFlow,
      fallNetCashFlow,
      winterNetCashFlow,
    ]) {
      runningBalanceMicros += seasonNet.amountMicros;
      troughMicros = Math.min(troughMicros, runningBalanceMicros);
    }

    return troughMicros;
  }

  calculateWorstCaseLoanToValueRatio(
    loanAmount: CurrencyMetadata | null | undefined,
    farmPropertyValue: CurrencyMetadata | null | undefined,
    seasonInputs: CashFlowSeasonInputs,
  ): number | null {
    const baselineLoanToValueRatio =
      this.opportunityLoanToValueRatioService.calculateLoanToValueRatio(
        loanAmount,
        farmPropertyValue,
      );

    if (
      !isDefined(baselineLoanToValueRatio) ||
      baselineLoanToValueRatio <= BASELINE_LOAN_TO_VALUE_THRESHOLD
    ) {
      return null;
    }

    const troughMicros = this.calculateSeasonalTroughMicros(seasonInputs);

    if (!isDefined(troughMicros)) {
      return null;
    }

    // loanAmount/farmPropertyValue are guaranteed defined here - a non-null
    // baselineLoanToValueRatio only comes back when both were defined.
    const shortfallMicros = troughMicros < 0 ? Math.abs(troughMicros) : 0;
    const worstCaseLoanAmountMicros =
      (loanAmount as CurrencyMetadata).amountMicros + shortfallMicros;
    const ratio =
      worstCaseLoanAmountMicros /
      (farmPropertyValue as CurrencyMetadata).amountMicros;

    return Math.round(ratio * RATIO_ROUNDING_FACTOR) / RATIO_ROUNDING_FACTOR;
  }

  async areWorstCaseLoanToValueFieldsEnabled(
    workspaceId: string,
  ): Promise<boolean> {
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
      isDefined(fieldIdByName[FARM_PROPERTY_VALUE_FIELD_NAME]) &&
      isDefined(fieldIdByName[LOAN_TO_VALUE_RATIO_FIELD_NAME]) &&
      isDefined(fieldIdByName[STARTING_CASH_BALANCE_FIELD_NAME]) &&
      isDefined(fieldIdByName[SPRING_NET_CASH_FLOW_FIELD_NAME]) &&
      isDefined(fieldIdByName[SUMMER_NET_CASH_FLOW_FIELD_NAME]) &&
      isDefined(fieldIdByName[FALL_NET_CASH_FLOW_FIELD_NAME]) &&
      isDefined(fieldIdByName[WINTER_NET_CASH_FLOW_FIELD_NAME]) &&
      isDefined(fieldIdByName[WORST_CASE_LOAN_TO_VALUE_RATIO_FIELD_NAME])
    );
  }

  async getExistingCashFlowInputs({
    workspaceId,
    opportunityId,
  }: {
    workspaceId: string;
    opportunityId: string;
  }): Promise<CashFlowSeasonInputs> {
    // System auth context + bypass: internal lookup supporting the worst-case
    // calculation, not the user's own query - the user's permissions were
    // already enforced for the mutation this hook is running inside of.
    const systemAuthContext = buildSystemAuthContext(workspaceId);

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const opportunityRepository =
          await this.globalWorkspaceOrmManager.getRepository<OpportunityWorkspaceEntity>(
            workspaceId,
            OPPORTUNITY_OBJECT_NAME_SINGULAR,
            { shouldBypassPermissionChecks: true },
          );

        const existingOpportunity = await opportunityRepository.findOne({
          where: { id: opportunityId },
        });

        const existingCashFlowFields = existingOpportunity as unknown as {
          startingCashBalance: CurrencyMetadata | null;
          springNetCashFlow: CurrencyMetadata | null;
          summerNetCashFlow: CurrencyMetadata | null;
          fallNetCashFlow: CurrencyMetadata | null;
          winterNetCashFlow: CurrencyMetadata | null;
        };

        return {
          startingCashBalance:
            existingCashFlowFields?.startingCashBalance ?? null,
          springNetCashFlow: existingCashFlowFields?.springNetCashFlow ?? null,
          summerNetCashFlow: existingCashFlowFields?.summerNetCashFlow ?? null,
          fallNetCashFlow: existingCashFlowFields?.fallNetCashFlow ?? null,
          winterNetCashFlow: existingCashFlowFields?.winterNetCashFlow ?? null,
        };
      },
      systemAuthContext,
    );
  }
}
