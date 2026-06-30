We have completed an initial integration test using realistic CSV data.

Do NOT implement new features.

Focus entirely on fixing and hardening the existing implementation.

Priority 0 (must be fixed first)

1. Dashboard crashes after CSV import.
   - Investigate the CashFlowChart null `slice()` error.
   - Ensure analytics endpoints never return invalid values.
   - Add defensive null handling throughout dashboard components.
   - One malformed transaction must never crash the UI.

2. CSV validation.
   - Invalid rows (e.g. INVALID_DATE) must never be committed.
   - Validation failures should remain in the preview with clear error messages.
   - Only valid rows should be imported.

Priority 1

3. Implement fully functional manual transaction creation.
   - The "+ Add Transaction" button should open a transaction creation modal (or navigate to a create form if that is the existing UX).
   - Support create, validate, save, and immediate UI refresh.

4. Fix rule engine integration.
   - Ensure automatic categorization is actually executed during CSV import before transactions are committed.
   - Verify rules are persisted and applied in priority order.

5. Dashboard consistency.
   - Net Worth displayed in the sidebar and dashboard should come from the same backend source.
   - Refresh automatically after imports or manual edits.

Priority 2

6. AI chat persistence.
   - Preserve chat history when navigating between pages.
   - Persist chat locally (preferably in SQLite) or at minimum in application state.
   - Navigating away and back should not clear the conversation.

General requirements

- Do not redesign the UI.
- Do not add Phase 6 AI provider functionality.
- Focus only on fixing bugs, improving robustness, and completing missing Phase 4/5 behavior.
- Add regression tests where appropriate to prevent these issues from reoccurring.