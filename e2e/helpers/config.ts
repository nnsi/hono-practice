const POOL_OFFSET = (Number(process.env.VITEST_POOL_ID ?? 1) - 1) * 10;

export const BACKEND_PORT = 3457 + POOL_OFFSET;
export const FRONTEND_PORT = 5176 + POOL_OFFSET;
export const BASE_URL = `http://localhost:${FRONTEND_PORT}`;
