# Access token logout policy

## Decision

Logout revokes the presented refresh token immediately. Access tokens remain
stateless JWTs and therefore cannot be revoked individually; their TTL is
limited to 15 minutes. Clients must discard the access token after logout.

## Security boundary

- A stolen refresh token stops working after logout/revocation.
- A previously issued access token can remain valid for at most 15 minutes.
- Password reset, account deletion, and incident-wide invalidation can still
  rotate `JWT_SECRET`, at the cost of signing every user out.

Server-side access-token denylisting was rejected for this release because it
would add a strongly-consistent lookup to every authenticated request. The
short TTL plus refresh-token rotation bounds the residual risk without making
authentication depend on another online store.
