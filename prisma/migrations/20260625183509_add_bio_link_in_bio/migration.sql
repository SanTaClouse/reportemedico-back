-- CreateTable
CREATE TABLE "BioPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL DEFAULT 'bio',
    "title" TEXT NOT NULL DEFAULT 'Reporte Médico',
    "subtitle" TEXT,
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BioPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BioLink" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BioLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BioPageView" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "referrer" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BioPageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BioLinkClick" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "referrer" TEXT,
    "device" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BioLinkClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BioPage_slug_key" ON "BioPage"("slug");

-- CreateIndex
CREATE INDEX "BioLink_pageId_order_idx" ON "BioLink"("pageId", "order");

-- CreateIndex
CREATE INDEX "BioPageView_pageId_createdAt_idx" ON "BioPageView"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "BioLinkClick_linkId_createdAt_idx" ON "BioLinkClick"("linkId", "createdAt");

-- AddForeignKey
ALTER TABLE "BioLink" ADD CONSTRAINT "BioLink_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "BioPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BioPageView" ADD CONSTRAINT "BioPageView_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "BioPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BioLinkClick" ADD CONSTRAINT "BioLinkClick_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "BioLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
