import { useState } from "react";

import { createUseBinaryMode } from "@packages/frontend-shared/recording-modes/modes/createUseBinaryMode";

export const useBinaryMode = createUseBinaryMode({
  react: { useState },
});
