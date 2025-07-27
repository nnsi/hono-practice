import mitt from "mitt";

type Events = {
  "token-refreshed": string;
  unauthorized: void;
  "tasks:refresh": void;
};

export const eventBus = mitt<Events>();
