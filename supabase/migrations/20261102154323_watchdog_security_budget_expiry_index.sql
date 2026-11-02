-- The rolling cleanup predicate must not scan every active login counter.
create index v2_security_budgets_expiry on public.v2_security_budgets(window_start);
