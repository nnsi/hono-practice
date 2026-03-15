import { useState } from "react";

import { createUseManualMode } from "@packages/frontend-shared/recording-modes/modes/createUseManualMode";

export const useManualMode = createUseManualMode({
  react: { useState },
});
