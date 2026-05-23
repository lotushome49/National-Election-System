-- Materialized views to accelerate reporting queries.
-- Run this in Postgres as a migration step (psql -f create_materialized_views.sql).

-- Ballot counts grouped by election and region
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ballot_counts_by_election_region AS
SELECT election_id, region_id, COUNT(*) AS total_ballots
FROM ballots
WHERE deleted_at IS NULL
GROUP BY election_id, region_id;

-- Registered voters grouped by region
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_registered_voters_by_region AS
SELECT region_id, COUNT(*) AS total_registered
FROM voters
WHERE deleted_at IS NULL
GROUP BY region_id;

-- Indexes to speed lookups
CREATE INDEX IF NOT EXISTS idx_mv_ballot_election_region ON mv_ballot_counts_by_election_region (election_id, region_id);
CREATE INDEX IF NOT EXISTS idx_mv_registered_region ON mv_registered_voters_by_region (region_id);

-- To refresh materialized views periodically or after import:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ballot_counts_by_election_region;
-- REFRESH MATERIALIZED VIEW CONCURRENTLY mv_registered_voters_by_region;
