export type ForecastYearDateRange = {
  start: Date;
  end: Date;
};

// The widget's season order runs Spring -> Summer -> Fall -> Winter, so a
// forecast anchored to forecastYear covers March 1 of that year through the
// last day of February the following year, not a plain Jan-Dec calendar year.
export const getForecastYearDateRange = (
  forecastYear: number,
): ForecastYearDateRange => {
  const start = new Date(Date.UTC(forecastYear, 2, 1));
  const end = new Date(Date.UTC(forecastYear + 1, 2, 1) - 1);

  return { start, end };
};

export const isDateWithinForecastYear = (
  date: Date,
  forecastYear: number,
): boolean => {
  const { start, end } = getForecastYearDateRange(forecastYear);

  return date >= start && date <= end;
};
