import { useState } from "react";

import { createUseTimerMode } from "@packages/frontend-shared/recording-modes/modes/createUseTimerMode";

import { useTimer } from "../../../hooks/useTimer";

export const useTimerMode = createUseTimerMode({
  react: { useState },
  useTimer,
});
