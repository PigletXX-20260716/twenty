import { CashFlowSeasonEventsDropdown } from '@/page-layout/widgets/cash-flow/components/CashFlowSeasonEventsDropdown';
import { CashFlowSeasonEventsPreview } from '@/page-layout/widgets/cash-flow/components/CashFlowSeasonEventsPreview';
import { type CashFlowEventRecord } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowEventsForRecord';
import { type CashFlowSeasonNet } from '@/page-layout/widgets/cash-flow/utils/computeCashFlowSeries';
import { formatSignedShortCurrency } from '@/page-layout/widgets/cash-flow/utils/formatSignedShortCurrency';
import { type SeasonLabel } from '@/page-layout/widgets/cash-flow/utils/getSeasonForDate';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { useOpenDropdown } from '@/ui/layout/dropdown/hooks/useOpenDropdown';
import { isDropdownOpenComponentState } from '@/ui/layout/dropdown/states/isDropdownOpenComponentState';
import { useAtomComponentStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomComponentStateValue';
import { styled } from '@linaria/react';
import { useId } from 'react';
import { AppTooltip, TooltipDelay } from 'twenty-ui/surfaces';
import { themeCssVariables } from 'twenty-ui/theme-constants';

const StyledGrid = styled.div`
  display: grid;
  gap: ${themeCssVariables.spacing['2']};
  grid-template-columns: repeat(4, 1fr);
`;

const StyledCard = styled.div<{ isTrough: boolean }>`
  background: ${({ isTrough }) =>
    isTrough ? themeCssVariables.background.danger : 'transparent'};
  border: 1px solid
    ${({ isTrough }) =>
      isTrough
        ? themeCssVariables.border.color.danger
        : themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  cursor: pointer;
  padding: ${themeCssVariables.spacing['2']};
`;

const StyledLabel = styled.div<{ isTrough: boolean }>`
  color: ${({ isTrough }) =>
    isTrough
      ? themeCssVariables.font.color.danger
      : themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xxs};
  letter-spacing: 0.03em;
  text-transform: uppercase;
`;

const StyledValue = styled.div<{ isNegative: boolean }>`
  color: ${({ isNegative }) =>
    isNegative
      ? themeCssVariables.font.color.danger
      : themeCssVariables.color.turquoise8};
  font-size: ${themeCssVariables.font.size.md};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  margin-top: ${themeCssVariables.spacing['1']};
`;

type CashFlowSeasonCardProps = {
  seasonNet: CashFlowSeasonNet;
  isTrough: boolean;
  currencyCode: string;
  events: CashFlowEventRecord[];
};

const CashFlowSeasonCard = ({
  seasonNet,
  isTrough,
  currencyCode,
  events,
}: CashFlowSeasonCardProps) => {
  const instanceId = useId();
  const dropdownId = `cash-flow-season-dropdown-${seasonNet.label}-${instanceId}`;
  const tooltipAnchorId = `cash-flow-season-card-${seasonNet.label}-${instanceId}`;
  const { openDropdown } = useOpenDropdown();
  const isDropdownOpen = useAtomComponentStateValue(
    isDropdownOpenComponentState,
    dropdownId,
  );

  const card = (
    <StyledCard id={tooltipAnchorId} isTrough={isTrough}>
      <StyledLabel isTrough={isTrough}>{seasonNet.label} net</StyledLabel>
      <StyledValue isNegative={seasonNet.value < 0}>
        {formatSignedShortCurrency(seasonNet.value, currencyCode)}
      </StyledValue>
    </StyledCard>
  );

  return (
    <>
      <Dropdown
        dropdownId={dropdownId}
        clickableComponent={card}
        dropdownComponents={<CashFlowSeasonEventsDropdown events={events} />}
        dropdownPlacement="bottom-start"
      />
      {!isDropdownOpen && (
        <AppTooltip
          anchorSelect={`#${tooltipAnchorId}`}
          delay={TooltipDelay.shortDelay}
          clickable
          place="bottom"
        >
          <CashFlowSeasonEventsPreview
            events={events}
            onMoreClick={() =>
              openDropdown({ dropdownComponentInstanceIdFromProps: dropdownId })
            }
          />
        </AppTooltip>
      )}
    </>
  );
};

type CashFlowSeasonCardsProps = {
  seasonNets: CashFlowSeasonNet[];
  troughSeasonLabel: string | undefined;
  currencyCode: string;
  eventsBySeasonLabel: Record<SeasonLabel, CashFlowEventRecord[]>;
};

export const CashFlowSeasonCards = ({
  seasonNets,
  troughSeasonLabel,
  currencyCode,
  eventsBySeasonLabel,
}: CashFlowSeasonCardsProps) => {
  return (
    <StyledGrid>
      {seasonNets.map((seasonNet) => (
        <CashFlowSeasonCard
          key={seasonNet.label}
          seasonNet={seasonNet}
          isTrough={seasonNet.label === troughSeasonLabel}
          currencyCode={currencyCode}
          events={eventsBySeasonLabel[seasonNet.label as SeasonLabel] ?? []}
        />
      ))}
    </StyledGrid>
  );
};
