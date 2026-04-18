-- Add incident resolution fields
ALTER TABLE "Incident" ADD COLUMN "resolvedAt" TIMESTAMP(3);
ALTER TABLE "Incident" ADD COLUMN "resolvedBy" TEXT;

-- Add Slack webhook URL to AlertPref
ALTER TABLE "AlertPref" ADD COLUMN "slackWebhookUrl" TEXT;
