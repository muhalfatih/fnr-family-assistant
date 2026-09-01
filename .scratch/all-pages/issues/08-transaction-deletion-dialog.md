# 08: Safe Transaction Deletion with Confirmation Dialog

**What to build:** A secure deletion workflow for transactions on `/` providing an AlertDialog confirmation prompt with exact transaction details to prevent accidental data loss.

**Blocked by:** 05: Modern Transaction Ledger, Search, and Type Filters

**Status:** ready-for-agent

- [ ] Trash action button on each transaction row with accessible label.
- [ ] Radix UI AlertDialog displaying transaction amount, description, and permanent deletion warning.
- [ ] Optimistic state update / SWR revalidation upon confirmed deletion.
