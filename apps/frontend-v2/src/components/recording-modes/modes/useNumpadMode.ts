import { useState } from "react";

import { createUseNumpadMode } from "@packages/frontend-shared/recording-modes/modes/createUseNumpadMode";

export const useNumpadMode = createUseNumpadMode({
  react: { useState },
});
