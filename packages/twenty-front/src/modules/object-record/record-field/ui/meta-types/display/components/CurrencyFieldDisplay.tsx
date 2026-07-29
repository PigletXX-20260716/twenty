import { useCurrencyFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useCurrencyFieldDisplay';
import { useCashFlowSeasonFieldOverride } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowSeasonFieldOverride';
import { CurrencyDisplay } from '@/ui/field/display/components/CurrencyDisplay';
import { styled } from '@linaria/react';
import { useId } from 'react';
import { AppTooltip, TooltipDelay } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledComputedWrapper = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  width: 100%;
`;

export const CurrencyFieldDisplay = () => {
  const { fieldValue, fieldDefinition } = useCurrencyFieldDisplay();
  const { isComputedFromEvents, tooltipContent } =
    useCashFlowSeasonFieldOverride();
  const instanceId = useId().replace(/[^a-zA-Z0-9-_]/g, '-');
  const tooltipAnchorId = `cash-flow-season-field-computed-${instanceId}`;

  const display = (
    <CurrencyDisplay
      currencyValue={fieldValue}
      fieldDefinition={fieldDefinition}
    />
  );

  if (!isComputedFromEvents) {
    return display;
  }

  return (
    <StyledComputedWrapper id={tooltipAnchorId}>
      {display}
      <AppTooltip
        anchorSelect={`#${tooltipAnchorId}`}
        delay={TooltipDelay.shortDelay}
        place="bottom"
      >
        {tooltipContent}
      </AppTooltip>
    </StyledComputedWrapper>
  );
};
