-- JobRole catalog and link from UserProfile

CREATE TABLE "JobRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JobRole_name_key" ON "JobRole"("name");

ALTER TABLE "UserProfile" ADD COLUMN "jobRoleId" TEXT;
CREATE INDEX "UserProfile_jobRoleId_idx" ON "UserProfile"("jobRoleId");

ALTER TABLE "UserProfile"
  ADD CONSTRAINT "UserProfile_jobRoleId_fkey"
  FOREIGN KEY ("jobRoleId") REFERENCES "JobRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
