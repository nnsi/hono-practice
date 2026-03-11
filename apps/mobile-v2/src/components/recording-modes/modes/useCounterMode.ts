import { useState } from "react";

import { createUseCounterMode } from "@packages/frontend-shared/recording-modes/modes/createUseCounterMode";

export const useCounterMode = createUseCounterMode({
  react: { useState },
});
