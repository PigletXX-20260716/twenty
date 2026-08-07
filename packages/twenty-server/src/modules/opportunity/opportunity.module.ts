import { Module } from '@nestjs/common';

import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { OpportunityCreateOnePreQueryHook } from 'src/modules/opportunity/query-hooks/opportunity-create-one.pre-query.hook';
import { OpportunityLoanToValueRatioService } from 'src/modules/opportunity/query-hooks/opportunity-loan-to-value-ratio.service';
import { OpportunityRiskFlagRationaleService } from 'src/modules/opportunity/query-hooks/opportunity-risk-flag-rationale.service';
import { OpportunityRiskFlagSuggestionService } from 'src/modules/opportunity/query-hooks/opportunity-risk-flag-suggestion.service';
import { OpportunityUpdateOnePreQueryHook } from 'src/modules/opportunity/query-hooks/opportunity-update-one.pre-query.hook';
import { OpportunityWorstCaseLoanToValueRatioService } from 'src/modules/opportunity/query-hooks/opportunity-worst-case-loan-to-value-ratio.service';

@Module({
  imports: [WorkspaceManyOrAllFlatEntityMapsCacheModule],
  providers: [
    OpportunityLoanToValueRatioService,
    OpportunityWorstCaseLoanToValueRatioService,
    OpportunityRiskFlagSuggestionService,
    OpportunityRiskFlagRationaleService,
    OpportunityCreateOnePreQueryHook,
    OpportunityUpdateOnePreQueryHook,
  ],
})
export class OpportunityModule {}
