export type ParsedActivityLog = {
  activityId: string;
  activityKindId: string | null;
  quantity: number;
  date: string;
  memo: string;
};

export type ParseActivityLogResult = {
  parsed: ParsedActivityLog;
  interpretation: {
    detectedActivityName: string;
    detectedKindName: string | null;
    rawText: string;
  };
};

export type ActivityContext = {
  id: string;
  name: string;
  quantityUnit: string | null;
  kinds: { id: string; name: string }[];
};

export type AIActivityLogGateway = {
  parseActivityLog(
    speechText: string,
    activities: ActivityContext[],
    today: string,
  ): Promise<ParseActivityLogResult>;
};
