---
name: Event end-date fields
description: Which Supabase event date fields are machine-readable vs display strings
---
In the `events` table, `date_end` often holds display strings ("Jul 20, 2026") while `date_end_iso` holds ISO ("2026-07-20"). `date` can also be a display string. Some rows have `date_end_iso` set but `date_end` null.

**Why:** Frontend compute sites use a strict `^\d{4}-\d{2}-\d{2}$` regex; feeding them `date_end` silently treated multi-day events as single-day, pushing them to "past" after day one.

**How to apply:** Any computation (past/filter/sort) or `displayDateRange`/`displayDate` call must use `date_end_iso ?? date_end`. Explicit supabase `.select('...')` column lists must include `date_end_iso`. Applies to both web (artifacts/cultive) and mobile (artifacts/cultive-mobile).
