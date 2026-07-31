import { Module } from '@nestjs/common';

import { WorkspaceManyOrAllFlatEntityMapsCacheModule } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.module';
import { OpportunityCreateOnePreQueryHook } from 'src/modules/opportunity/query-hooks/opportunity-create-one.pre-query.hook';
import { OpportunityLoanToValueRatioService } from 'src/modules/opportunity/query-hooks/opportunity-loan-to-value-ratio.service';
import { OpportunityUpdateOnePreQueryHook } from 'src/modules/opportunity/query-hooks/opportunity-update-one.pre-query.hook';
import { OpportunityWorstCaseLoanToValueRatioService } from 'src/modules/opportunity/query-hooks/opportunity-worst-case-loan-to-value-ratio.service';

@Module({
  imports: [WorkspaceManyOrAllFlatEntityMapsCacheModule],
  providers: [
    OpportunityLoanToValueRatioService,
    OpportunityWorstCaseLoanToValueRatioService,
    OpportunityCreateOnePreQueryHook,
    OpportunityUpdateOnePreQueryHook,
  ],
})
export class OpportunityModule {}
