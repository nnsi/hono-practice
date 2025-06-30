import mitt from "mitt";

type Events = {
  "token-refreshed": string;
  unauthorized: void;
};

export const eventBus = mitt<Events>();
