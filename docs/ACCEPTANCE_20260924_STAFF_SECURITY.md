# Staff access and invitation security — 2026-09-24

## Acceptance checklist

| Requirement | Status | Evidence |
|---|---|---|
| Owner can create a staff invitation with scoped permissions | verified locally | `manageTeam` validates owner context and Zod permission shape; `manage_staff` independently validates owner, tenant, title, email, token hash and exact permission keys. |
| Copying and sharing the link is obvious | verified locally | Owner UI has a labeled `Скопировать ссылку` button, read-only fallback field and three explicit steps. |
| Invite secret does not appear in request URLs | verified locally | New links use `#token=...`; the join page reads the fragment and immediately removes it from browser history. Legacy query links remain readable. |
| Employee can create a password and enter the staff cabinet | verified in code/tests | Registration validates the invitation before privileged account creation, requires the invitation email, enforces a 15–128 character non-obvious password, signs in and atomically accepts access. Existing-account flow preserves the token in the URL fragment across login. |
| Invitation is single-use, email-bound and expiring | verified in SQL regression/code | 256-bit random token, SHA-256 hash at rest, row lock on acceptance, verified email match, accepted/revoked checks and 48-hour expiry for new invitations. |
| Owner can edit permissions | verified locally | Existing optimistic `revision` guard remains; UI explains read/write levels and preserves owner-only billing/team controls. |
| Owner can immediately revoke access | verified in SQL regression/code | Setting `active=false` is checked by every staff RPC on the next request; notification eligibility also requires active access. |
| Owner can remove a team member | verified in SQL regression/code | New `remove` operation is tenant-scoped, owner-only, audited and removes the membership; UI has a separate confirmation action. |
| Cross-tenant access and direct client writes are denied | verified by regression test | `supabase/tests/staff_access_regression.sql` covers outsider invite, wrong email, replay, missing permission, revoked use, direct table mutation and removal audit. |
| Known production dependency vulnerabilities | verified locally | `pnpm audit --prod` reports 0 after overriding vulnerable transitive `js-yaml` to 4.3.2. |
| Continuous security scanning | verified as configuration | Weekly Dependabot, weekly/push/PR CodeQL and production dependency audit workflows were added; YAML parsed locally. They begin running after push. |
| Production database migration | verified | Owner authorized publication. `staff_access_security_and_removal` and the covering `staff_invitation_accepted_by_index` migration are applied to project `gklgbesydbottkqilihb`; the complete SQL regression ran inside a transaction and rolled back all fixtures. |
| Production application release | verified | Commit `f24a20c` is deployed as Vercel production deployment `dpl_4ToSgt3JxbUs8P1Ycj6evujXf79D`, Ready and aliased to `www.dukenim.kz` and `dukenim.kz`. `/admin/team` redirects unauthenticated requests, while `/staff/join` and `/support` return HTTP 200 with HSTS and same-origin frame protection. |
| Live two-browser journey | verified through restore | A production owner created a disposable invitation; a separate Edge session registered the matching employee, opened `/staff`, and initially saw Orders, Catalog, Stock and Customers. The owner changed the role to Content Manager and the employee view changed to Catalog and AI Studio; disabling showed `Активного доступа нет`, and restoring brought the two modules back. Final removal and exact fixture cleanup remain pending because UI deletion requires a separate action-time confirmation. |
| Supabase leaked-password protection | externally blocked | The current Supabase Security Advisor reports it disabled; Supabase documents this control as a Pro-plan feature. Local staff passwords still receive length and obvious-password screening. |
| Mandatory MFA for owners and staff | not started | TOTP enrollment/challenge UI and AAL2 database enforcement are a separate product flow and are not represented as complete. |

## Security model

- `staff_access` remains separate from legacy `tenant_users`; accepting an invitation never grants owner membership.
- Every staff read or mutation resolves `auth.uid()`, membership id, tenant id, active state and module permission inside the database operation.
- Owner mutations are Server Actions with server-side role checks and a second owner/tenant check in the database RPC.
- New invitation secrets are 32 random bytes. Only their SHA-256 digest is stored. Raw secrets appear once in the owner UI and stay in the browser URL fragment during login.
- Revocation does not depend on JWT expiry because each staff data operation reads the current membership row. A stolen JWT cannot continue staff operations after the membership becomes inactive or is removed.
- Audit events record invitation, acceptance, update, revoke and removal actions without storing the raw invitation token.

## Checks run

- `npm run test`: 97 files / 488 tests passed; 4 live-AI tests intentionally skipped.
- `npx tsc --noEmit`: passed before and after build.
- Targeted ESLint: passed.
- `npm run build`: passed; 79 pages generated.
- `pnpm audit --prod --json`: 0 known vulnerabilities after the patched override.
- Production Supabase migration and `supabase/tests/staff_access_regression.sql`: passed. The advisor no longer reports `staff_invitations.accepted_by` as an unindexed foreign key; older unrelated findings remain.
- Supabase Security Advisor reviewed: staff SECURITY DEFINER RPCs are intentionally exposed only to `authenticated` and perform internal identity/tenant/permission checks; leaked-password protection remains disabled externally.

## Production boundary

The database and application release are live. The complete two-browser production journey is verified through restore. The remaining destructive step is to press `Удалить из команды` and then remove the exact synthetic employee account/invitation; this requires an action-time deletion confirmation.
