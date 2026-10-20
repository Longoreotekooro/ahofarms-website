# Analytics and enquiry handover

Use [the replacement JSON](gtm/GTM-WJN7H2PZ-public-analytics.json) with PR #3.
[PR #2](https://github.com/Longoreotekooro/ahofarms-website/pull/2) remains open
and unchanged; do not merge both. This revision extends the known live GTM
version 7 configuration, published by the owner on 20 October 2026. It is
reviewable code, but the account and delivery checks below remain unresolved.

## One incremental container replacement

Account `6337875715`, container `242787201`, public ID `GTM-WJN7H2PZ`.
The full Version 2 WEB export preserves 5 tags, 4 triggers and 13 variables.
Against the known live version 7 configuration, expect **two modified tags
and one modified trigger, with no added or deleted entities**:

| Entity | Change |
|---|---|
| Form Submit tag 8 | Unpaused. Existing `formSubmits` event requires `aho_form_success`, fixed form ID/name, allowed=true, production host and a reviewed public path. Parameters are only form ID/name and sanitised page location/referrer/title. |
| Form trigger 7 | Adds the same public-page, production-host and allowed guards as Initialization trigger 18. |
| Hubspot tag 9 | Unpaused; existing account `443276122` loader now fires only on restricted public Initialization trigger 18. |
| Google tag 3 / email tag 6 | Unchanged from version 7: standard automatic GA4 pageviews (`G-3MS8DHXLX7`) and guarded `clickEmail` intent event. |
| Manual pageview tag 20 | Remains **paused**. Do not enable alongside automatic pageviews. |

Owner import: **Merge → Overwrite conflicting tags, triggers and variables**,
inspect detailed changes, then publish. Do not use the top-level Overwrite
container option, Rename conflicts, or later publish an older workspace over
this configuration. This supersedes earlier generated files. See Google's
[import instructions](https://support.google.com/tagmanager/answer/6106997?hl=en).
The agent has not imported or published any GTM changes.

Keep Enhanced Measurement on. Turn **Site Search only off** because this site
has no search feature and that feature separately reads query values.
Automatic form_submit measures interaction, not successful enquiry delivery.
Google documents the [Enhanced Measurement metadata](https://support.google.com/analytics/answer/9216061?hl=en).

## Enquiries and tracking

Contact and Export handlers now return failure when Resend rejects mail, is
unconfigured, cannot be reached, or returns no acceptance ID. The browser
retains fields and shows an actionable error. Only an accepted provider
response clears fields and emits one fixed success event. In-flight repeated
submissions are ignored. Analytics errors cannot turn accepted mail into a
failed enquiry. Acceptance does not prove inbox delivery. Honeypot responses
never emit success events. No submitted name, email, message or health data
is added to custom GA4 events.

The mail adapter also serves other enquiry routes; they receive accurate
failure responses but no new analytics instrumentation. No live enquiry has
been submitted during this work.

Default-on tracking is production-host pinned and limited to 19 reviewed
public pages. The 27 excluded pages include portals and patient-access pages.
Opt-out, GPC/DNT and unavailable storage prevent loading. Withdrawal requests
Google consent denial, HubSpot cookie revocation and HubSpot Do Not Track,
clears analytics cookies, and reloads; cross-tab changes also reload. Explicit
opt-in removes HubSpot's Do Not Track cookie using its supported API.
There is no noscript tracker, advertising or remarketing configuration.

GA4 uses canonical public page paths without query/fragment, reviewed internal
referrer paths or external origins, and six bounded UTM campaign labels.
Checks reject obvious email/phone/control-character values, but are not a
semantic personal-data detector. Campaign labels must never contain personal
or health information. Native Enhanced Measurement metadata is not globally
scrubbed by these overrides; public forms now have clean explicit action paths.

HubSpot's native tracker can read raw current URL/referrer, cookie identifiers
and network/device data. `setPath` is not a complete URL/referrer scrubber.
No visitor-identify-by-email call is added. The CSP allows the existing AP1
loader, analytics and cookie-banner hosts, plus required tracking connections.
It intentionally does not allow `hscollectedforms` automatic capture: HubSpot
[does not support these custom JavaScript forms through automatic non-HubSpot capture](https://knowledge.hubspot.com/forms/use-non-hubspot-forms),
and that capture can record submission attempts before successful delivery.
Visitor tracking does **not** establish Contact/Export CRM form integration.
The site's opt-out stops both providers; any HubSpot account cookie choices
are additional controls and have not been verified.

Default-on applies globally. No trusted country mechanism exists; no country
is inferred and no worldwide legal-compliance claim is made.

## Outstanding account checks and release sequence

1. Owner confirms production `RESEND_API_KEY` is present and supplies only the
   non-secret `MAIL_FROM`, `CONTACT_TO` and `ENQUIRY_TO` routing values. Do not
   share the API key. Source fallbacks are `Aho Farms Portals <portals@ahofarms.co.nz>`
   and `admin@ahofarms.com`; actual production overrides and Resend sender-domain
   verification are unknown. Only `RESEND_API_KEY` is required: the three
   routing/sender overrides are optional if their fallbacks are correct and
   Resend authorises the fallback sender. A missing override is not a failure. Vercel metadata and environment reads were denied
   (403, team scope), so production configuration was not established.
2. In existing HubSpot account `443276122`, confirm **Settings → Tracking &
   Analytics → Tracking Code** is for the Aho production site and provides the
   AP1 loader for account `443276122`. The browser currently reaches Login;
   this is unverified, not a demonstrated account failure. No CRM Forms API
   integration is required by this handover. No automatic sign-in, new
   credentials or permissions are requested.
3. Owner imports/publishes the incremental JSON; client reviews/merges PR #3.
   The agreed sequence is merge then live verification. Vercel preview requires
   owner authorisation; no access bypass is attempted or required here.
4. After merge, inspect actual GA/HubSpot requests and effective CSP: one
   automatic pageview, one email-click intent, fixed form-success fields,
   no manual duplicate, no portal trackers, working opt-out and campaign
   reporting. Check account destinations, user-provided-data and advertising
   settings rather than assuming JSON controls them.
5. Before any real enquiry test, confirm exact recipients and obtain approval
   for the synthetic fields/message and resulting email.
   Verify both Contact and Export inbox receipt and fixed GA4 success events.
   No real test is authorised or performed by the local mock checks.

These dependencies prevent an honest claim that everything is operational or
that the handover requires no further account work. No merge, deployment,
GTM publication, external test email or CRM write has been performed.

## Evidence

`check-analytics` covers scope, consent queue ordering, URL/campaign handling,
GPC/DNT/storage, both-provider withdrawal and cookie cleanup.
`check-gtm` checks native maps, live-v7 compatibility, paused manual tag,
restricted HubSpot trigger and fixed success payload/guards. Full export
validation against known version 7 passes with zero errors/warnings.
`check-enquiry-tracking.mjs` exercises actual frontend handlers → API handlers
→ mail adapter with only external mail transport mocked: missing key,
provider rejection, network error, malformed acceptance, successful acceptance,
repeated clicks, validation/honeypot, retained fields and opt-out/no private
analytics fields. This is application-contract evidence, not inbox/CRM proof
or execution of Google's native templates.

Independent review found and confirmed fixes for consent revocation and
analytics-callback error isolation. The approved four temporary noindex pages,
sitemap18, navigation and portal access remain preserved. The normal complete
regeneration sequence and analytics/enquiry/indexing/nav/launch/audit checks
are part of final local verification.
