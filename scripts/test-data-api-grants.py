#!/usr/bin/env python3
"""Replay migrations and test grants in a disposable, network-isolated Postgres.

Requires Python 3 and Docker. Never accepts a production URL or credentials.
The small auth/storage fixture supplies external Supabase service dependencies;
application tables, constraints, functions and RLS come from repository migrations.
"""
import json
from pathlib import Path
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
IMAGE = 'public.ecr.aws/supabase/postgres:17.6.1.063'
MIGRATION = '20260923124226_explicit_data_api_grants.sql'
ISMS = (ROOT / 'packages/ai-centre/supabase/migrations').is_dir()
CONTAINER = 'data-api-grants-' + uuid.uuid4().hex[:12]


def command(args, **kwargs):
    return subprocess.run(args, capture_output=True, encoding='utf-8', **kwargs)


def sql(query, db='grant_test', expect_success=True):
    result = command(['docker', 'exec', '-i', '--env', 'PGPASSWORD=local-test-only',
                      CONTAINER, 'psql', '-X', '-q', '-A', '-t', '-U', 'supabase_admin',
                      '-d', db, '-v', 'ON_ERROR_STOP=1'], input=query)
    if expect_success and result.returncode:
        raise RuntimeError(result.stderr)
    return result


def snapshot():
    return sql("""SELECT jsonb_build_object(
      'policies', (SELECT jsonb_agg(to_jsonb(p) ORDER BY schemaname,tablename,policyname) FROM pg_policies p),
      'defaults', (SELECT jsonb_agg(to_jsonb(d) ORDER BY oid) FROM pg_default_acl d),
      'relations', (SELECT jsonb_agg(jsonb_build_array(c.oid,c.relrowsecurity,c.relacl::text) ORDER BY c.oid)
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','v'))
    );""").stdout


def main():
    started = command(['docker', 'run', '--detach', '--rm', '--name', CONTAINER,
                       '--network', 'none', '--env', 'POSTGRES_PASSWORD=local-test-only', IMAGE])
    if started.returncode:
        raise RuntimeError(started.stderr)
    try:
        for _ in range(60):
            # The image's temporary initialization server accepts Unix sockets only.
            # Wait for TCP so migrations cannot race its shutdown and final startup.
            ready = command(['docker', 'exec', CONTAINER, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'])
            if ready.returncode == 0:
                break
            time.sleep(0.5)
        else:
            raise RuntimeError('Disposable Postgres did not become ready')
        sql('CREATE DATABASE grant_test OWNER postgres;', db='postgres')
        sql((ROOT/'supabase/tests/support/grants-bootstrap.sql').read_text())
        directories = [ROOT/'supabase/migrations']
        if ISMS:
            directories = [ROOT/'apps/maturion-maturity-legacy/supabase/migrations',
                           ROOT/'packages/ai-centre/supabase/migrations'] + directories
        count = 0
        for directory in directories:
            for path in sorted(directory.glob('*.sql')):
                if path.name == MIGRATION:
                    continue
                # Exactly matches the production workflow's pre-seeded legacy entry.
                if ISMS and path.name == '20260310000001_wave16_6_schema_audit_completeness.sql':
                    continue
                result = sql('SET ROLE postgres;\n' + path.read_text(encoding='utf-8'), expect_success=False)
                if result.returncode:
                    raise RuntimeError(str(path.relative_to(ROOT)) + ': ' + result.stderr)
                count += 1
        checks = (ROOT/'supabase/tests/data-api-grants-coverage.sql').read_text()
        before = sql(checks, expect_success=False)
        if before.returncode == 0 or 'Missing ' not in before.stderr:
            raise AssertionError('Expected a missing-grant regression before the repair: ' + before.stderr)
        print('PASS: missing grants reproduced with automatic privileges disabled')
        old = json.loads(snapshot())
        repair = 'SET ROLE postgres;\n' + (ROOT/'supabase/migrations'/MIGRATION).read_text()
        sql(repair)
        sql(checks)
        first = snapshot()
        new = json.loads(first)
        assert old['policies'] == new['policies'], 'Repair changed RLS policies'
        assert old['defaults'] == new['defaults'], 'Repair changed automatic grants'
        assert [(x[0],x[1]) for x in old['relations']] == [(x[0],x[1]) for x in new['relations']], 'Repair changed tables/RLS'
        sql(repair)
        assert first == snapshot(), 'Repair is not idempotent'
        print(f'PASS: {count} historical migrations replayed; role coverage and idempotency verified')
        sql((ROOT/'supabase/tests/data-api-grants-access.sql').read_text())
        print('PASS: real role reads/writes, row isolation and restricted-table boundaries')
        # Prove unlisted future tables are never exposed by this migration.
        sql('SET ROLE postgres; CREATE TABLE public.future_private_probe(id int); ALTER TABLE public.future_private_probe ENABLE ROW LEVEL SECURITY;')
        sql(repair)
        denied = sql("SELECT NOT has_table_privilege('anon','public.future_private_probe','SELECT') AND NOT has_table_privilege('authenticated','public.future_private_probe','SELECT') AND NOT has_table_privilege('service_role','public.future_private_probe','SELECT');").stdout.strip()
        assert denied == 't', 'Repair exposed an unlisted future table'
        # Any unexpectedly unprotected allowlisted table must abort the whole repair.
        target = 'mmm_profiles' if ISMS else 'profiles'
        sql(f'SET ROLE postgres; ALTER TABLE public.{target} DISABLE ROW LEVEL SECURITY;')
        bad_before = snapshot()
        rejected = sql(repair, expect_success=False)
        assert rejected.returncode and 'enable and review RLS' in rejected.stderr, rejected.stderr
        assert bad_before == snapshot(), 'Failed repair was not atomic'
        print('PASS: future-table deny-by-default and atomic refusal of unprotected tables')
    finally:
        stopped = command(['docker', 'rm', '--force', CONTAINER])
        if stopped.returncode:
            raise RuntimeError('Could not remove test container ' + CONTAINER + ': ' + stopped.stderr)


if __name__ == '__main__':
    main()
