// E2E-only: flip the seeded user back to the free plan.
// Calls the backend dev endpoint (gated by NODE_ENV !== production/stg server-side).
// Maestro http runs on the host, so localhost:3536 is the mobile-e2e backend
// regardless of iOS/Android target device.
var resp = http.post("http://localhost:3536/dev/subscription/plan", {
  body: JSON.stringify({
    loginId: "e2e@example.com",
    plan: "free",
  }),
  headers: { "Content-Type": "application/json" },
});
output.SET_PLAN_FREE = resp.body;
