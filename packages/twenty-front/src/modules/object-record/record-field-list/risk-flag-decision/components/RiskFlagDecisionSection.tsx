import { useEffect, useState } from 'react';

import { useUpdateOneRecord } from '@/object-record/hooks/useUpdateOneRecord';
import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { RISK_FLAG_FIELD_NAMES } from '@/object-record/record-field-list/risk-flag-decision/constants/RiskFlagFieldNames';
import { TextArea } from '@/ui/input/components/TextArea';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { IconSparkles } from 'twenty-ui/icon';
import {
  Button,
  SegmentedControl,
  type SegmentedControlOption,
} from 'twenty-ui/input';
import { themeCssVariables } from 'twenty-ui/theme-constants';

type RiskFlagOutcome = 'APPROVE' | 'MANUALREVIEW' | 'DECLINE';

// No AI suggestion has been computed yet (e.g. the record hasn't triggered
// the pre-query hook, or the workspace hasn't added the AI fields yet) -
// Manual Review is the safe default so nothing is pre-selected as "clear".
const DEFAULT_OUTCOME: RiskFlagOutcome = 'MANUALREVIEW';

const StyledContainer = styled.div`
  background: ${themeCssVariables.background.secondary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.md};
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[2]};
  margin-bottom: ${themeCssVariables.spacing[4]};
  padding: ${themeCssVariables.spacing[3]};
`;

const StyledSectionHeading = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  gap: ${themeCssVariables.spacing[1]};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const StyledLabel = styled.div`
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.sm};
`;

const StyledAiBadge = styled.div`
  align-items: center;
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-size: ${themeCssVariables.font.size.xs};
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledTriggeringFactors = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  white-space: pre-line;
`;

const StyledFooter = styled.div`
  display: flex;
  justify-content: flex-end;
`;

type RiskFlagDecisionSectionProps = {
  objectRecordId: string;
};

export const RiskFlagDecisionSection = ({
  objectRecordId,
}: RiskFlagDecisionSectionProps) => {
  const { updateOneRecord } = useUpdateOneRecord();

  const outcomeOptions: SegmentedControlOption<RiskFlagOutcome>[] = [
    { value: 'APPROVE', label: t`Approve` },
    { value: 'MANUALREVIEW', label: t`Manual Review` },
    { value: 'DECLINE', label: t`Decline` },
  ];

  const aiSuggestedDecision = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: objectRecordId,
      fieldName: RISK_FLAG_FIELD_NAMES.aiSuggestedDecision,
    },
  ) as RiskFlagOutcome | null | undefined;

  const aiSuggestedTriggeringFactors = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: objectRecordId,
      fieldName: RISK_FLAG_FIELD_NAMES.aiSuggestedTriggeringFactors,
    },
  ) as string | null | undefined;

  const aiSuggestedRationale = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: objectRecordId,
      fieldName: RISK_FLAG_FIELD_NAMES.aiSuggestedRationale,
    },
  ) as string | null | undefined;

  const officerDecision = useAtomFamilySelectorValue(recordStoreFamilySelector, {
    recordId: objectRecordId,
    fieldName: RISK_FLAG_FIELD_NAMES.officerDecision,
  }) as RiskFlagOutcome | null | undefined;

  const officerDecisionRationale = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: objectRecordId,
      fieldName: RISK_FLAG_FIELD_NAMES.officerDecisionRationale,
    },
  ) as string | null | undefined;

  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [selectedOutcome, setSelectedOutcome] =
    useState<RiskFlagOutcome>(DEFAULT_OUTCOME);
  const [rationaleText, setRationaleText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep syncing local state from the record store until the officer makes
  // their first edit - not just a one-time initialization, since a locked-in
  // snapshot from before the AI suggestion is computed would never update.
  // Twenty's TEXT fields come back from the record store as '' rather than
  // null/undefined when unset, so an empty officerDecisionRationale must be
  // treated as "not submitted yet", not as the officer's real (blank) answer.
  useEffect(() => {
    if (hasUserEdited || aiSuggestedDecision === undefined) {
      return;
    }

    setSelectedOutcome(officerDecision ?? aiSuggestedDecision ?? DEFAULT_OUTCOME);
    setRationaleText(
      officerDecisionRationale && officerDecisionRationale.length > 0
        ? officerDecisionRationale
        : (aiSuggestedRationale ?? ''),
    );
    setHasLoadedOnce(true);
  }, [
    hasUserEdited,
    aiSuggestedDecision,
    officerDecision,
    aiSuggestedRationale,
    officerDecisionRationale,
  ]);

  if (!hasLoadedOnce) {
    return null;
  }

  const isAiDraftUnchanged =
    selectedOutcome === aiSuggestedDecision &&
    rationaleText === (aiSuggestedRationale ?? '');

  const handleOutcomeChange = (newOutcome: RiskFlagOutcome) => {
    setHasUserEdited(true);
    setSelectedOutcome(newOutcome);

    // Reverting to the AI's original suggestion restores its draft rationale,
    // discarding any manual edits made in the meantime - picking anything
    // else clears the field so the officer writes their own.
    setRationaleText(
      newOutcome === aiSuggestedDecision ? (aiSuggestedRationale ?? '') : '',
    );
  };

  const handleRationaleChange = (newRationaleText: string) => {
    setHasUserEdited(true);
    setRationaleText(newRationaleText);
  };

  const handleSubmit = async () => {
    if (rationaleText.trim().length === 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await updateOneRecord({
        objectNameSingular: 'opportunity',
        idToUpdate: objectRecordId,
        updateOneRecordInput: {
          [RISK_FLAG_FIELD_NAMES.officerDecision]: selectedOutcome,
          [RISK_FLAG_FIELD_NAMES.officerDecisionRationale]: rationaleText,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StyledContainer data-testid="risk-flag-decision-section">
      <StyledSectionHeading>
        <IconSparkles size={14} />
        {t`Decision suggestion`}
      </StyledSectionHeading>

      <StyledLabel>{t`Officer decision:`}</StyledLabel>
      <SegmentedControl
        ariaLabel={t`Officer decision`}
        options={outcomeOptions}
        value={selectedOutcome}
        onChange={handleOutcomeChange}
        itemWidth="content"
      />

      <StyledLabel>{t`Rationale (required)`}</StyledLabel>

      {isAiDraftUnchanged && (
        <StyledAiBadge>
          <IconSparkles size={12} />
          {t`AI draft, edit as needed`}
        </StyledAiBadge>
      )}

      {isDefined(aiSuggestedTriggeringFactors) &&
        aiSuggestedTriggeringFactors.length > 0 && (
          <StyledTriggeringFactors>
            {t`Based on:`}
            {'\n'}
            {aiSuggestedTriggeringFactors}
          </StyledTriggeringFactors>
        )}

      <TextArea
        textAreaId={`risk-flag-rationale-${objectRecordId}`}
        placeholder={t`Write your own`}
        value={rationaleText}
        onChange={handleRationaleChange}
        minRows={2}
        maxRows={8}
      />

      <StyledFooter>
        <Button
          title={t`Submit`}
          variant="primary"
          accent="blue"
          disabled={rationaleText.trim().length === 0}
          isLoading={isSubmitting}
          onClick={handleSubmit}
        />
      </StyledFooter>
    </StyledContainer>
  );
};
