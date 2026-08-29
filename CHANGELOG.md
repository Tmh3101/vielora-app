## [Unreleased] - Smart Homepage (SH-001)

### Added

- Intent-driven navigation: chatbot can redirect visitors to configured Key Action Pages
- Backend: NAVIGATE response type, intent matcher, URL validator, plan-gating helper, security event logging
- Frontend: countdown banner with Cancel, localStorage auto-reopen, ARIA, client-side domain re-validation
- DB: security_events table for blocked-attempt / cancellation audit
- Tests: 15 unit + 6 integration; manual test catalog (14 cases)

### Security

- 3-layer navigation validation; malicious URLs blocked server-side + logged; no external redirects
