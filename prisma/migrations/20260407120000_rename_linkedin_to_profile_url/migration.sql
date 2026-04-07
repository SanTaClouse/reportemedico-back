-- Rename linkedinUrl → profileUrl (preserves existing data)
ALTER TABLE "CouncilMember" RENAME COLUMN "linkedinUrl" TO "profileUrl";
