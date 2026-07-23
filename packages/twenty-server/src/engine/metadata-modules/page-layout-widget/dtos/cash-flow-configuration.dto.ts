import { Field, ObjectType } from '@nestjs/graphql';

import { IsIn, IsNotEmpty } from 'class-validator';
import { type CashFlowConfiguration } from 'twenty-shared/types';

import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';

@ObjectType('CashFlowConfiguration')
export class CashFlowConfigurationDTO implements CashFlowConfiguration {
  @Field(() => WidgetConfigurationType)
  @IsIn([WidgetConfigurationType.CASH_FLOW])
  @IsNotEmpty()
  configurationType: WidgetConfigurationType.CASH_FLOW;
}
