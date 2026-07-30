import { useDateFieldDisplay } from '@/object-record/record-field/ui/meta-types/hooks/useDateFieldDisplay';
import { isCashFlowEventDateField } from '@/object-record/record-field/ui/types/guards/isCashFlowEventDateField';
import { DateDisplay } from '@/ui/field/display/components/DateDisplay';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useId } from 'react';
import { AppTooltip, TooltipDelay } from 'twenty-ui/surfaces';

const StyledTooltipAnchor = styled.div`
  width: 100%;
`;

export const DateFieldDisplay = () => {
  const { fieldValue, fieldDefinition } = useDateFieldDisplay();

  const dateFieldSettings = fieldDefinition.metadata?.settings;
  const instanceId = useId().replace(/[^a-zA-Z0-9-_]/g, '-');
  const tooltipAnchorId = `cash-flow-event-date-tooltip-anchor-${instanceId}`;

  const dateDisplay = (
    <DateDisplay value={fieldValue} dateFieldSettings={dateFieldSettings} />
  );

  if (!isCashFlowEventDateField(fieldDefinition)) {
    return dateDisplay;
  }

  return (
    <StyledTooltipAnchor id={tooltipAnchorId}>
      {dateDisplay}
      <AppTooltip
        anchorSelect={`#${tooltipAnchorId}`}
        delay={TooltipDelay.shortDelay}
        place="bottom"
      >
        {t`Should fall within the parent Opportunity's forecast year window (March 1 through the last day of the following February). This is enforced when adding an event through the "Add cashflow event" form — dates outside the window are rejected there, but editing an existing event's date here is not currently blocked.`}
      </AppTooltip>
    </StyledTooltipAnchor>
  );
};
