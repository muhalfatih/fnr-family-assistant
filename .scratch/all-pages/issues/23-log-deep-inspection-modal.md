# 23: Log Deep-Inspection Modal with Extracted JSON Metadata

**What to build:** A detailed inspection modal on `/logs` opening on row click to display the full raw user prompt, AI-extracted JSON receipt metadata, and error stack traces.

**Blocked by:** 22: Chat Activity Stream Table with Multi-Filter and Latency

**Status:** ready-for-agent

- [ ] Click-to-inspect dialog with formatted timestamp and status badge.
- [ ] Sender name and execution latency in milliseconds.
- [ ] Raw user prompt scrollable container.
- [ ] Formatted JSON viewer for AI parsed metadata (merchant, items, amount).
- [ ] Red error trace container for failed or timeout tasks.
