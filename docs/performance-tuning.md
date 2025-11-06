# ETL Performance Tuning and Monitoring (Banking-Grade)

This document summarizes recommended performance tuning, monitoring, and testing strategies applied to the ETL worker/scheduler and how to reproduce the benchmarks.

## What changed

- Introduced a detached background worker (`scripts/job-worker.cjs`) that executes ETL jobs outside the Next.js server process to avoid blocking, improve reliability, and enable horizontal scaling of workers.
- The job start API (`/api/jobs/:id/run`) now spawns the worker as a detached process and returns quickly to the caller.
- Worker implements batching, configurable concurrency, consolidated DB updates, retry/backoff for transient errors, and audit logs.
- Added a load-testing script (`scripts/load-testing.js`) that can be used to generate stress scenarios and capture metrics (already present, use with config overrides below).

## Key configuration knobs

Set these via environment variables (or orchestrator config) for production tuning:

- BATCH_SIZE (default 1000): number of records processed per batch. Larger batches reduce DB write frequency but increase per-batch latency and memory footprint.
- CONCURRENCY (default 4): number of parallel batch workers within a single worker process. Use CPU/RAM to size this; for I/O-bound workloads increase concurrency.
- PROGRESS_UPDATE_MS (default 2000): how often the worker flushes progress counters to the database. Increasing reduces DB write load.
- FAILURE_RATE (simulation): used only for testing to simulate per-record failures.
- FAILURE_THRESHOLD_PERCENT (default 10): percent failures above which execution is marked FAILED.
- MAX_RETRIES (default 3): per-batch transient retry attempts.
- TOTAL_RECORDS (test-only): set to a deterministic number for reproducible load tests.

## Operational recommendations

1. Run multiple worker processes or containers (horizontal scaling). Use a simple orchestration (Kubernetes Deployment/Job) or systemd to keep workers alive.
2. Use a queue (Redis, SQS) when multiple producers and many workers exist — for now the worker is started per-execution; a queue improves throughput and backpressure.
3. For database scalability:
   - Ensure proper connection pooling (Prisma + PgPool). Increase DB max connections in line with worker counts.
   - Avoid frequent small writes — consolidate progress updates (as implemented).
4. For memory management:
   - Tune BATCH_SIZE to fit within available heap; prefer streaming row-by-row processing for huge records.
   - Keep per-record object allocation minimal and reuse buffers when possible.
5. Monitoring and alerts:
   - Surface jobExecution metrics to Prometheus/Grafana. Export: recordsProcessed, recordsFailed, executionDuration, successRate.
   - Alert if failure rate > configured threshold or if job runs > expected SLA.

## How to run a stress test (example)

Set environment and run the load-tester to generate API and DB load. Example local run (zsh):

```bash
# start the app and DB as normal then
# run the load tester (uses Prisma, ensure DATABASE_URL exported)
node scripts/load-testing.js
```

To run a single ETL worker execution locally with tuned params:

```bash
export EXECUTION_ID=<execution-id>
export JOB_ID=<job-id>
export TOTAL_RECORDS=200000
export BATCH_SIZE=5000
export CONCURRENCY=8
export PROGRESS_UPDATE_MS=5000
node scripts/job-worker.cjs
```

## Benchmarks and acceptance

- Use the `scripts/load-testing.js` to measure API baseline and DB throughput.
- For ETL runs, use TOTAL_RECORDS with realistic banking volumes (100k–10M) and sweep BATCH_SIZE/CONCURRENCY to find best throughput without exhausting memory.
- Key metrics to capture: records/sec, average per-batch latency, max memory, DB writes/sec, error rate.

## Next steps and improvements

- Introduce a persistent queue (Redis/RSMQ/BullMQ) so workers can claim jobs and ensure exactly-once / at-least-once semantics.
- Add a proper orchestration + autoscaling policy (HPA in k8s) based on queue depth and CPU/RAM.
- Export metrics to a time-series system and add dashboards/alerts for job failure, duration spikes, and dropped jobs.
- If strict financial integrity is required, add immutable audit records and deterministic replayable transformations.

