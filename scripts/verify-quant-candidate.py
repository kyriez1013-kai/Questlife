"""Hosted, stateless acceptance with repository fixtures, never owner records."""
import argparse
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys
from time import monotonic
from urllib.error import HTTPError
from urllib.request import Request, urlopen

parser = argparse.ArgumentParser()
parser.add_argument('--quant-root', type=Path, required=True)
parser.add_argument('--token-file', type=Path, required=True)
parser.add_argument('--url', required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
if not args.url.startswith('https://'):
    raise ValueError('HTTPS candidate required')
sys.path.insert(0, str(args.quant_root / 'src'))
from questlife_quant.real_data.fixtures import build_clean_owner_fixture

token = args.token_file.read_text().strip()
subject = 'qa-stateless-release-v1-a'
base = dict(mode='owner', subject_id=subject, configured_timezone='Australia/Melbourne',
            as_of='2026-08-20T12:00:00+00:00', app_data={})
results = []


def call(name, payload, expected, *, authenticated=True, identity=subject):
    headers = {'Content-Type': 'application/json'}
    if authenticated:
        headers.update(Authorization=f'Bearer {token}', **{'X-QuestLife-Subject-Id': identity})
    request = Request(args.url, data=json.dumps(payload).encode(), headers=headers, method='POST')
    start = monotonic()
    try:
        response = urlopen(request, timeout=25)
    except HTTPError as error:
        response = error
    with response:
        status, body = response.status, json.loads(response.read())
    assert status == expected, (name, status, body.get('error'))
    results.append(dict(name=name, status=status, milliseconds=round((monotonic()-start)*1000),
                        eligible_observations=body.get('eligible_observation_count'),
                        error=body.get('error'), quant_commit=body.get('quant_source_commit')))
    return body


call('no authentication', base, 401, authenticated=False)
call('body subject mismatch', {**base, 'subject_id': 'qa-other'}, 403)
call('future as-of', {**base, 'as_of': (datetime.now(timezone.utc)+timedelta(days=1)).isoformat()}, 400)
empty = call('empty snapshot', base, 200)
assert empty['eligible_observation_count'] == 0 and empty['product']['series'] == []
fixture = build_clean_owner_fixture(days=30)
mature = call('deterministic 30-day fixture, no persistence', {**base, 'app_data': fixture}, 200)
assert mature['eligible_observation_count'] == 210 and mature['product']['series']
assert mature['analysis']['joint_analyses']
corrected = deepcopy(fixture)
corrected['stateCheckIns'][-1]['overall'] = 1
changed = call('correction invalidates snapshot', {**base, 'app_data': corrected}, 200)
assert changed['source_snapshot_hash'] != mature['source_snapshot_hash']
deleted = call('all observations removed', base, 200)
assert deleted['eligible_observation_count'] == 0 and deleted['analysis'] is None
qa_only = deepcopy(fixture)
for collection in ('executionLogs', 'stateCheckIns'):
    for row in qa_only[collection]:
        row['dataProvenance']['origin'] = 'QA_TEST'
excluded = call('QA provenance excluded from owner eligibility', {**base, 'app_data': qa_only}, 200)
assert excluded['eligible_observation_count'] == 0
other = call('other subject receives no previous data', {**base, 'subject_id': 'qa-stateless-release-v1-b'},
             200, identity='qa-stateless-release-v1-b')
assert other['eligible_observation_count'] == 0 and subject not in json.dumps(other)
report = dict(test_kind='hosted stateless fixture verification, not real-owner or device acceptance',
              owner_data_used=False, database_writes=False, url=args.url,
              tested_at=datetime.now(timezone.utc).isoformat(), passed=len(results), results=results)
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
