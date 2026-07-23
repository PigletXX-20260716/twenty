export type CashFlowPoint = {
  label: string;
  value: number;
};

export type CashFlowSeasonNet = {
  label: string;
  value: number;
};

export type CashFlowSeries = {
  points: CashFlowPoint[];
  seasonNets: CashFlowSeasonNet[];
  troughIndex: number;
};

const SEASON_LABELS = ['Spring', 'Summer', 'Fall', 'Winter'] as const;

export const computeCashFlowSeries = ({
  startingBalance,
  seasonNetCashFlows,
}: {
  startingBalance: number;
  seasonNetCashFlows: [number, number, number, number];
}): CashFlowSeries => {
  const points: CashFlowPoint[] = [{ label: 'Start', value: startingBalance }];

  let runningBalance = startingBalance;

  seasonNetCashFlows.forEach((net, index) => {
    runningBalance += net;
    points.push({ label: SEASON_LABELS[index], value: runningBalance });
  });

  const seasonNets: CashFlowSeasonNet[] = SEASON_LABELS.map((label, index) => ({
    label,
    value: seasonNetCashFlows[index],
  }));

  // The trough can occur at any point in the series, including Start —
  // it's the deepest draw against the line, not necessarily a seasonal net.
  const troughIndex = points.reduce(
    (lowestIndex, point, index) =>
      point.value < points[lowestIndex].value ? index : lowestIndex,
    0,
  );

  return { points, seasonNets, troughIndex };
};
