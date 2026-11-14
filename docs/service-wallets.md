# Service pricing and registered-user wallets

## Service form

1. Choose a suggested service name or enter a custom name.
2. Choose the unit and service type from searchable dropdowns. A new type is saved when the service is saved. Manage types supports creating, renaming and deleting types.
3. Add expenses. Each expense supports editing and removal. There are no person fields in the service form.
4. Enter profit as a percentage of expenses or a fixed amount. The client rate is calculated on the client and again on the server. It remains visible next to the save controls.

| Before | After | Why |
| --- | --- | --- |
| Free text plus large unit/type chip lists | Suggested/custom names and searchable dropdowns | Reduce visible choices and keep custom entries possible |
| Expense inputs all expanded in the service form | Compact expense rows with an add/edit dialog | Keep the form focused |
| Manually entered client rate | Expenses plus percentage or fixed profit | Keep the displayed and saved totals consistent |
| Free-text person on each expense | Registered-user assignment in the final bill step | Credit a real account rather than matching names |
| A single earned/due balance | Pending, settled and main wallet balances | Separate delivery from payment |

## Wallet rules

- An assigned user earns the service line amount (rate × quantity), before invoice-wide discounts.
- A newly assigned service starts pending. It cannot be marked delivered by sending a delivery flag with bill creation.
- The bill owner marks a service delivered from the invoice. Only that service settles; other items can remain pending.
- Repeating delivery does not duplicate earnings. Reopening delivery moves the service back to pending.
- Reassigning an undelivered service removes the prior user’s pending amount and adds it to the new user. Clearing the assignment removes the credit.
- Reopen a delivered service before changing its assignee, rate or quantity.
- Editing or deleting a draft changes its pending credits immediately. Cancelling or deleting a bill removes its earnings. Recorded payments are retained as historical records.
- Main balance = settled services − recorded payments. Advances already paid can therefore result in a negative main balance before delivery.
- Registered users see only their own wallet. Admins manage payment records. Delivery updates require ownership of the bill.
- Earlier name-based assignments remain separate. They are not guessed into user accounts.

## Compatibility

Existing services keep their rate until edited in the new form; the editor infers their existing fixed profit from the previous rate and cost. Existing bill cost snapshots and previous payment records are preserved. Service deletion archives the catalog entry to retain saved package references. Custom types and delivery timestamps are persistent MongoDB records; wallet totals are derived from bills so no counter reconciliation is needed.

This application uses its existing single-studio user registry. The account selector includes the last four phone characters to distinguish users with matching names.

## Validation

Automated integration checks cover automatic service rates, type CRUD, expense totals, bill edits, delivery idempotence, reopening, reassignment, unassignment, draft deletion, payment CRUD, member privacy and public-invoice privacy. Browser checks cover suggested/custom names, dropdowns, expense CRUD, both profit modes, type CRUD, service CRUD, final-step assignment and delivery settlement. Desktop and mobile browser layouts were inspected; physical-device testing remains separate.


Final checks: **22 automated checks passed**, Expo web export passed, and the Chrome desktop/mobile flows passed. Browser checks also covered recording, editing and deleting wallet payments, with balance recalculation. No physical phone was available.

Preview captures use temporary test records:

- [Service form on mobile](screenshots/service-pricing-mobile.png)
- [Service form on desktop](screenshots/service-pricing-desktop.png)
- [Final bill assignment step](screenshots/bill-assignment.png)
- [Registered-user wallets](screenshots/wallets.png)
