-- AlterTable
ALTER TABLE "TopicNode" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];

