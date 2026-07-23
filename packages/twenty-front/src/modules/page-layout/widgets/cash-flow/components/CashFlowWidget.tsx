import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { recordStoreFamilySelector } from '@/object-record/record-store/states/selectors/recordStoreFamilySelector';
import { type FieldCurrencyValue } from '@/object-record/record-field/ui/types/FieldMetadata';
import { CASH_FLOW_FIELD_NAMES } from '@/page-layout/widgets/cash-flow/constants/CashFlowFieldNames';
import { CASH_FLOW_REQUIRED_FIELD_NAMES } from '@/page-layout/widgets/cash-flow/constants/CashFlowRequiredFieldNames';
import { CashFlowPanel } from '@/page-layout/widgets/cash-flow/components/CashFlowPanel';
import { type PageLayoutWidget } from '@/page-layout/types/PageLayoutWidget';
import { useTargetRecord } from '@/ui/layout/contexts/useTargetRecord';
import { useAtomFamilySelectorValue } from '@/ui/utilities/state/jotai/hooks/useAtomFamilySelectorValue';
import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import {
  AnimatedPlaceholder,
  AnimatedPlaceholderEmptyContainer,
  AnimatedPlaceholderEmptySubTitle,
  AnimatedPlaceholderEmptyTextContainer,
  AnimatedPlaceholderEmptyTitle,
} from 'twenty-ui/feedback';

const StyledContainer = styled.div`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const toDollars = (currencyValue: FieldCurrencyValue | null | undefined) =>
  (currencyValue?.amountMicros ?? 0) / 1_000_000;

type CashFlowWidgetProps = {
  widget: PageLayoutWidget;
};

export const CashFlowWidget = ({ widget: _widget }: CashFlowWidgetProps) => {
  const targetRecord = useTargetRecord();

  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: targetRecord.targetObjectNameSingular,
  });

  // Kept in sync manually with the identical check in
  // SidePanelPageLayoutRecordPageWidgetTypeSelect.tsx (the "+ Widget" picker)
  // — update both if the eligibility rule ever changes.
  const hasCashFlowFields = CASH_FLOW_REQUIRED_FIELD_NAMES.every((fieldName) =>
    objectMetadataItem.fields.some(
      (field) => field.name === fieldName && field.isActive,
    ),
  );

  const startingCashBalance = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: targetRecord.id,
      fieldName: CASH_FLOW_FIELD_NAMES.startingCashBalance,
    },
  ) as FieldCurrencyValue | null | undefined;

  const springNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: targetRecord.id,
      fieldName: CASH_FLOW_FIELD_NAMES.springNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;

  const summerNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: targetRecord.id,
      fieldName: CASH_FLOW_FIELD_NAMES.summerNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;

  const fallNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: targetRecord.id,
      fieldName: CASH_FLOW_FIELD_NAMES.fallNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;

  const winterNetCashFlow = useAtomFamilySelectorValue(
    recordStoreFamilySelector,
    {
      recordId: targetRecord.id,
      fieldName: CASH_FLOW_FIELD_NAMES.winterNetCashFlow,
    },
  ) as FieldCurrencyValue | null | undefined;

  // All five fields describe the same forecast, so they're expected to share
  // one currency — the starting balance's code is used as the panel's currency.
  const currencyCode = startingCashBalance?.currencyCode ?? 'USD';

  // Guards against a Cash Flow widget existing on an object that doesn't
  // have the required fields (e.g. added directly through the API, or the
  // fields were later deleted) — the "+ Widget" picker already hides this
  // option for ineligible objects, but this keeps the widget from rendering
  // a misleadingly blank $0 forecast if that guard is ever bypassed.
  if (!hasCashFlowFields) {
    return (
      <StyledContainer>
        <AnimatedPlaceholderEmptyContainer>
          <AnimatedPlaceholder type="noRecord" />
          <AnimatedPlaceholderEmptyTextContainer>
            <AnimatedPlaceholderEmptyTitle>
              {t`Cash Flow fields not found`}
            </AnimatedPlaceholderEmptyTitle>
            <AnimatedPlaceholderEmptySubTitle>
              {t`This object is missing the starting balance and seasonal net cash flow fields this widget needs`}
            </AnimatedPlaceholderEmptySubTitle>
          </AnimatedPlaceholderEmptyTextContainer>
        </AnimatedPlaceholderEmptyContainer>
      </StyledContainer>
    );
  }

  return (
    <StyledContainer>
      <CashFlowPanel
        startingBalance={toDollars(startingCashBalance)}
        seasonNetCashFlows={[
          toDollars(springNetCashFlow),
          toDollars(summerNetCashFlow),
          toDollars(fallNetCashFlow),
          toDollars(winterNetCashFlow),
        ]}
        currencyCode={currencyCode}
      />
    </StyledContainer>
  );
};
