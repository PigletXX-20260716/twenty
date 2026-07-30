import { CashFlowEventRow } from '@/page-layout/widgets/cash-flow/components/CashFlowEventRow';
import { type CashFlowEventRecord } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowEventsForRecord';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const HOVER_PREVIEW_MAX_EVENTS = 3;

const StyledContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing['2']};
  width: 220px;
`;

const StyledMoreRow = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.xs};
  text-decoration: underline;

  &:hover {
    color: ${themeCssVariables.font.color.secondary};
  }
`;

type CashFlowSeasonEventsPreviewProps = {
  events: CashFlowEventRecord[];
  onMoreClick: () => void;
};

export const CashFlowSeasonEventsPreview = ({
  events,
  onMoreClick,
}: CashFlowSeasonEventsPreviewProps) => {
  if (events.length === 0) {
    return <StyledContainer>{t`No cash flow events yet`}</StyledContainer>;
  }

  const visibleEvents = events.slice(0, HOVER_PREVIEW_MAX_EVENTS);
  const remainingCount = events.length - visibleEvents.length;

  return (
    <StyledContainer>
      {visibleEvents.map((event) => (
        <CashFlowEventRow key={event.id} event={event} />
      ))}
      {remainingCount > 0 && (
        <StyledMoreRow onClick={onMoreClick}>
          {t`+${remainingCount} more`}
        </StyledMoreRow>
      )}
    </StyledContainer>
  );
};
