import { useState } from "react";

import { createUseCheckMode } from "@packages/frontend-shared/recording-modes/modes/createUseCheckMode";

export const useCheckMode = createUseCheckMode({
  react: { useState },
});
