BEGIN;

-- AlterTable
ALTER TABLE "TopicNode" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES (gen_random_uuid()::text, 'a97198ec0371657be3407753a0a5c264bc60c7cb14edbbc1f75f6103dcf12ade', now(), '20260828100000_topic_node_aliases', NULL, NULL, now(), 1);

COMMIT;
