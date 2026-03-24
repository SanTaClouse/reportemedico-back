-- DropIndex
DROP INDEX "CouncilMember_order_idx";

-- CreateIndex
CREATE INDEX "ArticleSource_articleId_idx" ON "ArticleSource"("articleId");

-- CreateIndex
CREATE INDEX "CouncilMember_isVisible_order_idx" ON "CouncilMember"("isVisible", "order");

-- CreateIndex
CREATE INDEX "PodcastEpisode_isVisible_order_idx" ON "PodcastEpisode"("isVisible", "order");

-- CreateIndex
CREATE INDEX "PrintEdition_isVisible_idx" ON "PrintEdition"("isVisible");
