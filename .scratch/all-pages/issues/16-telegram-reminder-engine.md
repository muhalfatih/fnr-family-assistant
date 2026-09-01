# 16: Multi-Recipient HTML Telegram Reminder Broadcast Engine

**What to build:** The automated document expiry notification engine (`/api/documents/remind`) supporting GET and POST methods, HTML entity sanitization, and multi-recipient broadcast to all family members linked to Telegram.

**Blocked by:** 02: Design Tokens, Strict Spacing Scale & Tabular Numerals

**Status:** ready-for-agent

- [ ] API endpoint `/api/documents/remind` accepting both GET and POST requests.
- [ ] Querying all family members with registered Telegram Chat IDs.
- [ ] Safe HTML message formatting with XML entity escaping preventing Telegram API 400 errors.
- [ ] Multi-recipient broadcast dispatch with detailed success/failure response.
- [ ] UI trigger button on `/vault` with status banner feedback.
