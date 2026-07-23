import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';

export const StyledCashFlowCalloutBox = styled.div`
  background: ${themeCssVariables.background.danger};
  border: 1px solid ${themeCssVariables.border.color.danger};
  border-radius: ${themeCssVariables.border.radius.md};
  color: ${themeCssVariables.font.color.danger};
  font-size: ${themeCssVariables.font.size.xs};
  margin-top: ${themeCssVariables.spacing['3']};
  padding: ${themeCssVariables.spacing['2']} ${themeCssVariables.spacing['3']};
`;
