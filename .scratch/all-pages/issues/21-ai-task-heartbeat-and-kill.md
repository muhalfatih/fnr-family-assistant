# 21: Live AI Process Heartbeat and Task Kill Banner

**What to build:** Real-time AI process monitoring on `/logs` displaying an idle heartbeat ("Sistem AI Siaga") vs active running background tasks with elapsed timers and an instant force-cancel (*kill process*) action.

**Blocked by:** 02: Design Tokens, Strict Spacing Scale & Tabular Numerals

**Status:** ready-for-agent

- [ ] Real-time task polling via `/api/bot/tasks` every 2 seconds.
- [ ] Idle state card ("Sistem AI Siaga") with pulsing green dot.
- [ ] Active task banner showing sender name, input type (text, image, audio), channel, and elapsed timer.
- [ ] Force-cancel button with immediate cancellation API call and UI refresh.
