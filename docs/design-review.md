# PhotoFinder design and workflow review

14 November 2026. Reviewed the global skill catalog and all fourteen app screens. Preserved the existing public studio page, enquiry model, invoice privacy rules, and the Expo / React Native stack.

## Visual direction

Warm ivory surfaces, charcoal text, muted olive actions, Georgia headings, system sans-serif controls. Color marks an action or state. The workspace uses a persistent sidebar on desktop and a horizontally scrollable navigation strip on smaller screens. Forms retain visible labels and use empty fields instead of sample data.

| Before | After | Why |
| --- | --- | --- |
| Bright blue accents and multicolored dashboard cards | Ivory, charcoal, olive and simple ruled rows | A calmer, consistent studio identity |
| Repeated module cards and dashboard marketing copy | Actual billed totals, balances and recent bills | Make the overview useful for daily work |
| Every screen reached through the dashboard | Persistent workspace navigation | Reduce backtracking between tasks |
| Placeholder camera artwork on the studio page | Credited editorial photograph | Give the page a real photographic subject |
| Small inputs and inconsistent button sizes | 16px form text, 44px controls and keyboard focus styles | Improve touch and keyboard use |
| Crowded mobile invoice header | Stacked invoice details on narrow screens | Keep the studio and invoice number readable |
| Enquiry form overlapped the footer on phones | Content-sized stacked panels | Keep submission reachable |

## Screen review

| Screen | Changes and verification |
| --- | --- |
| Studio page | Editorial hero, shared palette, labelled enquiry form, working package selection and budget calculator; menu scrolls to sections; successful mobile submission verified |
| Sign in / registration | Shared styling, concise labels, setup-key hint removed, stored sessions validated against the API |
| Overview | Actual bill/client data, billed and outstanding totals, recent invoices, empty state and direct create action |
| Services | Consistent list and modal, common expense choices, live cost/profit calculations, optional assignments, custom units, removal of the final cost resets the stored total |
| Packages | Server-calculated cost snapshots, validated quantities, editable public visibility; public responses exclude costs |
| Clients | Date validation, editable date clearing, refreshed list, protection against deleting clients referenced by invoices |
| Bills | Refreshed list, share link returned by the API, concise sharing instructions, no phone number in the generated link |
| Create / edit bill | Four-step flow verified in Chrome, live quantity/discount/advance calculations, decimal quantity entry, links to add missing clients/services |
| Invoice detail | Paid/cancel/reopen controls, refreshed data, preserved invoice privacy, readable mobile header |
| Shared invoice | Configured API connection, shared-state and phone check, private fields excluded, mobile layout verified |
| Estimates | Shorter labels, decimal amounts shown accurately, selected discount carried into the bill |
| Calendar | Real-date validation, duplicate checks, refreshed data and availability feedback reset when changing the date |
| Team payments | Saved cost assignments, recorded payments, balances and cancelled-bill adjustments verified |
| Enquiries | Admin inbox with new/contacted/closed states; member access rejected |

## Validation

- `node --test backend/tests/*.test.js`: 13 checks passed, including integration tests against an isolated MongoDB database.
- `cd frontend && npm run build:web`: Expo web export passed.
- Chrome: all main workspace destinations visited with no page errors. Desktop review at 1440px and a 1024px overview check; workspace captures and overflow checks at 768px, 390px and 320px.
- Browser interactions verified: adding service costs and seeing live totals; complete bill wizard; mark paid; shared-invoice phone gate; mobile enquiry submission.
- Tests used a separate local database and API on port 3101. No real application records were changed.
- Real phone hardware and native iOS/Android builds were not available; browser emulation does not verify the software keyboard or device safe areas.

## Preview captures

Test records shown in these screenshots are fixtures, not real client data.

- [Desktop overview](screenshots/overview.png)
- [Public studio page](screenshots/studio-page.png)
- [Mobile overview](screenshots/overview-mobile.png)
- [Mobile invoice](screenshots/invoice-mobile.png)
- [Mobile sign in](screenshots/sign-in-mobile.png)
- [Mobile shared invoice](screenshots/shared-invoice-mobile.png)

## Photograph

The public hero uses a local editorial stand-in by [Mesa Photo on Unsplash](https://unsplash.com/photos/couple-holding-hands-with-rings-and-a-bouquet-V8JBij7CvUE), with attribution in the footer. It is not presented as PhotoFinder portfolio work. Replace `frontend/assets/studio-editorial.jpg` with the studio’s own photograph when available.

## Local use

Restart the backend after updating so the new enquiry routes and workflow fixes are loaded. The public frontend uses `EXPO_PUBLIC_API_URL` when supplied; bill sharing uses `FRONTEND_URL` or the requesting frontend origin. Existing configuration and credentials were preserved.

Run the isolated review API with `node backend/tests/preview-server.js` and an Expo preview with `EXPO_PUBLIC_API_URL=http://localhost:3101/api npx expo start --web --port 8086` from `frontend`. The fixture database is temporary and the preview account is defined in the test-only server file.
