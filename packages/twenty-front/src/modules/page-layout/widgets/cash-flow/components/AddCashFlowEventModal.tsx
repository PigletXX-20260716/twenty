import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { type FieldCurrencyValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { CASH_FLOW_FIELD_NAMES } from '@/page-layout/widgets/cash-flow/constants/CashFlowFieldNames';
import { CASH_FLOW_EVENT_FIELD_NAMES } from '@/page-layout/widgets/cash-flow/constants/CashFlowEventFieldNames';
import { type CashFlowEventRecord } from '@/page-layout/widgets/cash-flow/hooks/useCashFlowEventsForRecord';
import { isDateWithinForecastYear } from '@/page-layout/widgets/cash-flow/utils/getForecastYearDateRange';
import { getSeasonForDate } from '@/page-layout/widgets/cash-flow/utils/getSeasonForDate';
import { ModalStatefulWrapper } from '@/ui/layout/modal/components/ModalStatefulWrapper';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import { TextInput } from '@/ui/input/components/TextInput';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { convertCurrencyAmountToCurrencyMicros } from '~/utils/convertCurrencyToCurrencyMicros';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import { Button } from 'twenty-ui/input';
import { Section } from 'twenty-ui/layout';
import { H1Title, H1TitleFontColor } from 'twenty-ui/typography';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { isDefined } from 'twenty-shared/utils';

const SEASON_FIELD_NAME_BY_LABEL = {
  Spring: CASH_FLOW_FIELD_NAMES.springNetCashFlow,
  Summer: CASH_FLOW_FIELD_NAMES.summerNetCashFlow,
  Fall: CASH_FLOW_FIELD_NAMES.fallNetCashFlow,
  Winter: CASH_FLOW_FIELD_NAMES.winterNetCashFlow,
} as const;

const StyledCenteredTitle = styled.div`
  text-align: center;
`;

const StyledFieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing['3']};
  margin: ${themeCssVariables.spacing['4']} 0;
`;

const StyledError = styled.div`
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledButtonRow = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing['2']};
`;

type AddCashFlowEventModalProps = {
  modalInstanceId: string;
  opportunityId: string;
  forecastYear: number | null;
  currencyCode: string;
  events: CashFlowEventRecord[];
};

export const AddCashFlowEventModal = ({
  modalInstanceId,
  opportunityId,
  forecastYear,
  currencyCode,
  events,
}: AddCashFlowEventModalProps) => {
  const { closeModal } = useModal();
  const { createOneRecord, loading } = useCreateOneRecord<CashFlowEventRecord>({
    objectNameSingular: 'cashFlowEvent',
  });

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [amount, setAmount] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const [pendingOverrideSeasonLabel, setPendingOverrideSeasonLabel] = useState<
    keyof typeof SEASON_FIELD_NAME_BY_LABEL | null
  >(null);

  const springNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: opportunityId,
      fieldName: CASH_FLOW_FIELD_NAMES.springNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;
  const summerNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: opportunityId,
      fieldName: CASH_FLOW_FIELD_NAMES.summerNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;
  const fallNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: opportunityId,
      fieldName: CASH_FLOW_FIELD_NAMES.fallNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;
  const winterNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: opportunityId,
      fieldName: CASH_FLOW_FIELD_NAMES.winterNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;

  const seasonFieldValueByLabel = {
    Spring: springNetCashFlow,
    Summer: summerNetCashFlow,
    Fall: fallNetCashFlow,
    Winter: winterNetCashFlow,
  } as const;

  const resetForm = () => {
    setTitle('');
    setEventDate('');
    setAmount('');
    setDateError(null);
    setPendingOverrideSeasonLabel(null);
  };

  const handleClose = () => {
    resetForm();
    closeModal(modalInstanceId);
  };

  const createEvent = async () => {
    await createOneRecord({
      [CASH_FLOW_EVENT_FIELD_NAMES.title]: title,
      [CASH_FLOW_EVENT_FIELD_NAMES.eventDate]: eventDate,
      [CASH_FLOW_EVENT_FIELD_NAMES.amount]: {
        amountMicros: convertCurrencyAmountToCurrencyMicros(parseFloat(amount)),
        currencyCode,
      },
      [`${CASH_FLOW_EVENT_FIELD_NAMES.opportunity}Id`]: opportunityId,
    } as Partial<CashFlowEventRecord>);
    handleClose();
  };

  const handleSaveClick = () => {
    setDateError(null);

    if (!title || !eventDate || !amount) {
      return;
    }

    const parsedDate = new Date(eventDate);

    if (
      isDefined(forecastYear) &&
      !isDateWithinForecastYear(parsedDate, forecastYear)
    ) {
      setDateError(
        t`This date falls outside the forecast year — it won't be accepted.`,
      );
      return;
    }

    const season = getSeasonForDate(parsedDate);
    const eventsInSeason = events.filter(
      (event) =>
        isDefined(event.eventDate) &&
        getSeasonForDate(new Date(event.eventDate)) === season,
    );
    const seasonFieldValue = seasonFieldValueByLabel[season];
    const hasManualValue =
      eventsInSeason.length === 0 && isDefined(seasonFieldValue);

    if (hasManualValue) {
      setPendingOverrideSeasonLabel(season);
      return;
    }

    createEvent();
  };

  if (isDefined(pendingOverrideSeasonLabel)) {
    const seasonFieldValue =
      seasonFieldValueByLabel[pendingOverrideSeasonLabel];
    const manualAmount = (seasonFieldValue?.amountMicros ?? 0) / 1_000_000;

    return (
      <ModalStatefulWrapper
        modalInstanceId={modalInstanceId}
        onClose={handleClose}
        isClosable
        padding="large"
        narrowWidth
        autoHeight
      >
        <StyledCenteredTitle>
          <H1Title
            title={t`Override manual value?`}
            fontColor={H1TitleFontColor.Primary}
          />
        </StyledCenteredTitle>
        <Section>
          {t`${pendingOverrideSeasonLabel} net is currently a manually entered ${manualAmount.toFixed(2)} ${currencyCode}. Adding this event will switch ${pendingOverrideSeasonLabel} to auto-computed from events going forward.`}
        </Section>
        <StyledButtonRow>
          <Button
            onClick={() => setPendingOverrideSeasonLabel(null)}
            variant="secondary"
            title={t`Cancel`}
            fullWidth
          />
          <Button
            onClick={createEvent}
            variant="primary"
            title={t`Continue`}
            disabled={loading}
            fullWidth
          />
        </StyledButtonRow>
      </ModalStatefulWrapper>
    );
  }

  return (
    <ModalStatefulWrapper
      modalInstanceId={modalInstanceId}
      onClose={handleClose}
      isClosable
      padding="large"
      narrowWidth
      autoHeight
    >
      <StyledCenteredTitle>
        <H1Title
          title={t`Add Cash Flow Event`}
          fontColor={H1TitleFontColor.Primary}
        />
      </StyledCenteredTitle>
      <StyledFieldsContainer>
        <TextInput
          label={t`Title`}
          value={title}
          onChange={setTitle}
          fullWidth
          placeholder={t`e.g. Calf sale`}
        />
        <TextInput
          label={t`Date`}
          type="date"
          value={eventDate}
          onChange={setEventDate}
          fullWidth
        />
        <TextInput
          label={t`Amount`}
          type="number"
          value={amount}
          onChange={setAmount}
          fullWidth
          placeholder={t`Positive for cash in, negative for cash out`}
        />
        {dateError && <StyledError>{dateError}</StyledError>}
      </StyledFieldsContainer>
      <StyledButtonRow>
        <Button
          onClick={handleClose}
          variant="secondary"
          title={t`Cancel`}
          fullWidth
        />
        <Button
          onClick={handleSaveClick}
          variant="primary"
          title={t`Add`}
          disabled={loading}
          fullWidth
        />
      </StyledButtonRow>
    </ModalStatefulWrapper>
  );
};
