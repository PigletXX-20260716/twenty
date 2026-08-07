import { Test, type TestingModule } from '@nestjs/testing';

import { type CurrencyMetadata } from 'twenty-shared/types';

import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { OpportunityLoanToValueRatioService } from 'src/modules/opportunity/query-hooks/opportunity-loan-to-value-ratio.service';
import {
  type CashFlowSeasonInputs,
  OpportunityWorstCaseLoanToValueRatioService,
} from 'src/modules/opportunity/query-hooks/opportunity-worst-case-loan-to-value-ratio.service';

// 'amount' is a standard built-in field, always present regardless of custom
// field config, so it isn't part of the gating check below.
const ALL_FIELD_NAMES = [
  'farmPropertyValue',
  'loanToValueRatio',
  'startingCashBalance',
  'springNetCashFlow',
  'summerNetCashFlow',
  'fallNetCashFlow',
  'winterNetCashFlow',
  'worstCaseLoanToValueRatio',
];

const buildFlatEntityMaps = (presentFieldNames: string[]) => {
  const byUniversalIdentifier: Record<string, unknown> = {};
  const universalIdentifierById: Record<string, string> = {};

  for (const fieldName of presentFieldNames) {
    byUniversalIdentifier[`${fieldName}-universal-id`] = {
      id: `${fieldName}-id`,
      name: fieldName,
      objectMetadataId: 'opportunity-id',
      universalIdentifier: `${fieldName}-universal-id`,
    };
    universalIdentifierById[`${fieldName}-id`] = `${fieldName}-universal-id`;
  }

  return {
    flatObjectMetadataMaps: {
      byUniversalIdentifier: {
        'opportunity-universal-id': {
          id: 'opportunity-id',
          nameSingular: 'opportunity',
          fieldIds: presentFieldNames.map((fieldName) => `${fieldName}-id`),
          universalIdentifier: 'opportunity-universal-id',
        },
      },
      universalIdentifierById: {
        'opportunity-id': 'opportunity-universal-id',
      },
      universalIdentifiersByApplicationId: {},
    },
    flatFieldMetadataMaps: {
      byUniversalIdentifier,
      universalIdentifierById,
      universalIdentifiersByApplicationId: {},
    },
  };
};

const currency = (amountMicros: number): CurrencyMetadata => ({
  amountMicros,
  currencyCode: 'USD',
});

const seasonInputs = (
  overrides: Partial<CashFlowSeasonInputs> = {},
): CashFlowSeasonInputs => ({
  startingCashBalance: currency(0),
  springNetCashFlow: currency(0),
  summerNetCashFlow: currency(0),
  fallNetCashFlow: currency(0),
  winterNetCashFlow: currency(0),
  ...overrides,
});

describe('OpportunityWorstCaseLoanToValueRatioService', () => {
  let service: OpportunityWorstCaseLoanToValueRatioService;
  let getOrRecomputeManyOrAllFlatEntityMaps: jest.Mock;

  beforeEach(async () => {
    getOrRecomputeManyOrAllFlatEntityMaps = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpportunityWorstCaseLoanToValueRatioService,
        OpportunityLoanToValueRatioService,
        {
          provide: WorkspaceManyOrAllFlatEntityMapsCacheService,
          useValue: {
            getOrRecomputeManyOrAllFlatEntityMaps,
          },
        },
        {
          provide: GlobalWorkspaceOrmManager,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<OpportunityWorstCaseLoanToValueRatioService>(
      OpportunityWorstCaseLoanToValueRatioService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateWorstCaseLoanToValueRatio', () => {
    it('returns null when baseline LTV is null (missing inputs)', () => {
      const result = service.calculateWorstCaseLoanToValueRatio(
        null,
        currency(200_000_000_000),
        seasonInputs(),
      );

      expect(result).toBeNull();
    });

    it('returns null when baseline LTV is exactly at the 80% threshold', () => {
      const result = service.calculateWorstCaseLoanToValueRatio(
        currency(160_000_000_000),
        currency(200_000_000_000),
        seasonInputs(),
      );

      expect(result).toBeNull();
    });

    it('returns null when baseline LTV is just under the 80% threshold', () => {
      const result = service.calculateWorstCaseLoanToValueRatio(
        currency(159_000_000_000),
        currency(200_000_000_000),
        seasonInputs(),
      );

      expect(result).toBeNull();
    });

    it('equals the baseline LTV when the trough never dips below the starting balance and stays non-negative', () => {
      // Baseline 0.9 (above threshold); running balance only ever goes up.
      const result = service.calculateWorstCaseLoanToValueRatio(
        currency(180_000_000_000),
        currency(200_000_000_000),
        seasonInputs({
          startingCashBalance: currency(0),
          springNetCashFlow: currency(10_000_000_000),
          summerNetCashFlow: currency(5_000_000_000),
          fallNetCashFlow: currency(20_000_000_000),
          winterNetCashFlow: currency(1_000_000_000),
        }),
      );

      expect(result).toBe(0.9);
    });

    it('adds the shortfall to the loan amount when the trough goes negative mid-year', () => {
      // Baseline 0.9; running balance: 0 -> 10 -> 60 -> 40 -> -30_000_000_000 (Winter is the trough).
      const result = service.calculateWorstCaseLoanToValueRatio(
        currency(180_000_000_000),
        currency(200_000_000_000),
        seasonInputs({
          startingCashBalance: currency(0),
          springNetCashFlow: currency(10_000_000_000),
          summerNetCashFlow: currency(50_000_000_000),
          fallNetCashFlow: currency(-20_000_000_000),
          winterNetCashFlow: currency(-70_000_000_000),
        }),
      );

      // Trough = -30_000_000_000 -> shortfall 30_000_000_000
      // Worst-case loan = 180_000_000_000 + 30_000_000_000 = 210_000_000_000
      // Worst-case LTV = 210_000_000_000 / 200_000_000_000 = 1.05
      expect(result).toBe(1.05);
    });

    it('detects a trough at the starting balance itself, before any season net is applied', () => {
      // Baseline 0.9; starting balance is already the lowest point of the year.
      const result = service.calculateWorstCaseLoanToValueRatio(
        currency(180_000_000_000),
        currency(200_000_000_000),
        seasonInputs({
          startingCashBalance: currency(-10_000_000_000),
          springNetCashFlow: currency(100_000_000_000),
          summerNetCashFlow: currency(50_000_000_000),
          fallNetCashFlow: currency(-20_000_000_000),
          winterNetCashFlow: currency(30_000_000_000),
        }),
      );

      // Trough = -10_000_000_000 -> shortfall 10_000_000_000
      // Worst-case loan = 180_000_000_000 + 10_000_000_000 = 190_000_000_000
      // Worst-case LTV = 190_000_000_000 / 200_000_000_000 = 0.95
      expect(result).toBe(0.95);
    });

    it('returns null when a season field is missing (no partial guess)', () => {
      const result = service.calculateWorstCaseLoanToValueRatio(
        currency(180_000_000_000),
        currency(200_000_000_000),
        seasonInputs({ winterNetCashFlow: null }),
      );

      expect(result).toBeNull();
    });
  });

  describe('areWorstCaseLoanToValueFieldsEnabled', () => {
    it('returns true when all required fields exist for the workspace', async () => {
      getOrRecomputeManyOrAllFlatEntityMaps.mockResolvedValue(
        buildFlatEntityMaps(ALL_FIELD_NAMES),
      );

      const result =
        await service.areWorstCaseLoanToValueFieldsEnabled('workspace-id');

      expect(result).toBe(true);
    });

    it.each(ALL_FIELD_NAMES)(
      'returns false when %s is missing from the workspace',
      async (missingFieldName) => {
        getOrRecomputeManyOrAllFlatEntityMaps.mockResolvedValue(
          buildFlatEntityMaps(
            ALL_FIELD_NAMES.filter((name) => name !== missingFieldName),
          ),
        );

        const result =
          await service.areWorstCaseLoanToValueFieldsEnabled('workspace-id');

        expect(result).toBe(false);
      },
    );
  });
});
