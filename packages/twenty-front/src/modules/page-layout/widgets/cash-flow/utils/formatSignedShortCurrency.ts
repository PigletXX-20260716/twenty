import { formatToShortNumber } from 'twenty-shared/utils';

const getCurrencySymbol = (currencyCode: string): string => {
  try {
    const parts = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).formatToParts(0);

    return (
      parts.find((part) => part.type === 'currency')?.value ?? currencyCode
    );
  } catch {
    return currencyCode;
  }
};

export const formatSignedShortCurrency = (
  dollars: number,
  currencyCode: string,
): string => {
  const formatted = formatToShortNumber(dollars);
  const symbol = getCurrencySymbol(currencyCode);

  return formatted.startsWith('-')
    ? `−${symbol}${formatted.slice(1)}`
    : `${symbol}${formatted}`;
};
