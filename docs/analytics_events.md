# Anonymous Analytics Events

QuestLife records anonymous product events only. User-created names, notes, visions, and long-form text should not be sent in event properties.

## Setup

1. In Supabase SQL Editor, run `supabase/analytics_events.sql`.
2. In Vercel, add these Environment Variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Redeploy the Vercel app.

The service role key is only used by `/api/track` on the server side. The client only posts anonymous event payloads to the same-origin API route.

## Useful Queries

Recent events:

```sql
select * from analytics_events order by event_time desc limit 50;
```

Daily active anonymous users:

```sql
select date_trunc('day', event_time) day,
       count(distinct anonymous_user_id) users
from analytics_events
group by 1
order by 1 desc;
```

Event counts:

```sql
select event_name, count(*)
from analytics_events
group by event_name
order by count(*) desc;
```

Daily execution logs:

```sql
select date_trunc('day', event_time) day,
       count(*)
from analytics_events
where event_name = 'execution_log_saved'
group by 1
order by 1 desc;
```

Metric type usage:

```sql
select properties->>'metricType' metric_type,
       count(*)
from analytics_events
where event_name in ('skill_created', 'execution_log_saved')
group by 1
order by count(*) desc;
```
