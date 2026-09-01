# 22: Chat Activity Stream Table with Multi-Filter and Latency

**What to build:** The central audit table on `/logs` recording all inbound chat interactions across Telegram and WhatsApp with execution latency, sender identity, and execution status badges.

**Blocked by:** 02: Design Tokens, Strict Spacing Scale & Tabular Numerals

**Status:** ready-for-agent

- [ ] Multi-channel filter tabs (Semua Chat, Telegram, WhatsApp).
- [ ] Status filter tabs (Semua, Berhasil, Gagal, Timeout).
- [ ] Search input matching sender name, raw prompt, and error messages.
- [ ] Execution latency in milliseconds and seconds using monospace `tabular-nums`.
