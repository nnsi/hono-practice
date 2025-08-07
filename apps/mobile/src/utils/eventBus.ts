import mitt from "mitt";

type Events = {
  "token-refreshed": string;
  "token-refresh-needed": void;
  unauthorized: void;
  "tasks:refresh": void;
};

export const eventBus = mitt<Events>();
