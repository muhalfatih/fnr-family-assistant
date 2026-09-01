# 24: Type Invariants and Mechanical Design Detector Suite

**What to build:** Comprehensive static quality test suite ensuring zero TypeScript compilation errors, zero design detector violations, and global zero em-dash compliance.

**Blocked by:** 01 through 23

**Status:** ready-for-agent

- [ ] `tsc --noEmit` exits with code 0 and zero type errors.
- [ ] `.agents/skills/impeccable/scripts/detect.mjs` returns zero unapproved tokens.
- [ ] Grep audit confirms zero em-dash (`—`) characters across all source files.
