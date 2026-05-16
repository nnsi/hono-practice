// E2E-only: flip the seeded user to premium plan via the backend dev endpoint.
// See set-plan-free.js for the rationale.
var resp = http.post("http://localhost:3536/dev/subscription/plan", {
  body: JSON.stringify({
    loginId: "e2e@example.com",
    plan: "premium",
  }),
  headers: { "Content-Type": "application/json" },
});
output.SET_PLAN_PREMIUM = resp.body;
