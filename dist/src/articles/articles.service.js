"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticlesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const slugify_1 = __importDefault(require("slugify"));
let ArticlesService = class ArticlesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getHome() {
        const [hero, featured, latest, medicalArticles] = await Promise.all([
            this.prisma.article.findFirst({
                where: { relevance: 1, status: 'PUBLISHED' },
                include: { tags: { include: { tag: true } } },
            }),
            this.prisma.article.findMany({
                where: { relevance: 2, status: 'PUBLISHED' },
                take: 4,
                orderBy: { publishedAt: 'desc' },
                include: { tags: { include: { tag: true } } },
            }),
            this.prisma.article.findMany({
                where: { relevance: 3, status: 'PUBLISHED' },
                take: 6,
                orderBy: { publishedAt: 'desc' },
                include: { tags: { include: { tag: true } } },
            }),
            this.prisma.article.findMany({
                where: { type: 'MEDICAL_ARTICLE', status: 'PUBLISHED' },
                take: 3,
                orderBy: { publishedAt: 'desc' },
                include: { tags: { include: { tag: true } } },
            }),
        ]);
        return { hero, featured, latest, medicalArticles };
    }
    async findPublished(page = 1, limit = 10, type, tagSlug) {
        const where = { status: client_1.ArticleStatus.PUBLISHED };
        if (type)
            where.type = type;
        if (tagSlug) {
            where.tags = { some: { tag: { slug: tagSlug } } };
        }
        const [data, total] = await Promise.all([
            this.prisma.article.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { publishedAt: 'desc' },
                include: { tags: { include: { tag: true } } },
            }),
            this.prisma.article.count({ where }),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async findBySlug(slug) {
        const article = await this.prisma.article.findUnique({
            where: { slug },
            include: {
                tags: { include: { tag: true } },
                seoMetadata: true,
                sources: { orderBy: { order: 'asc' } },
                relatedFrom: {
                    include: {
                        relatedArticle: {
                            include: { tags: { include: { tag: true } } },
                        },
                    },
                },
            },
        });
        if (!article || article.status !== 'PUBLISHED') {
            throw new common_1.NotFoundException('Artículo no encontrado');
        }
        return article;
    }
    async incrementViews(slug) {
        return this.prisma.article.update({
            where: { slug },
            data: { viewsCount: { increment: 1 } },
        });
    }
    async findByIdAdmin(id) {
        const article = await this.prisma.article.findUnique({
            where: { id },
            include: {
                tags: { include: { tag: true } },
                seoMetadata: true,
                sources: { orderBy: { order: 'asc' } },
            },
        });
        if (!article)
            throw new common_1.NotFoundException('Artículo no encontrado');
        return article;
    }
    async findAllAdmin(params) {
        const { page = 1, limit = 20, type, status, relevance, tag, search, sort = 'publishedAt_desc' } = params;
        const where = {};
        if (type)
            where.type = type;
        if (status)
            where.status = status;
        if (relevance)
            where.relevance = relevance;
        if (tag)
            where.tags = { some: { tag: { slug: tag } } };
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { excerpt: { contains: search, mode: 'insensitive' } },
            ];
        }
        const orderBy = this.buildOrderBy(sort);
        const [data, total] = await Promise.all([
            this.prisma.article.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy,
                include: { tags: { include: { tag: true } } },
            }),
            this.prisma.article.count({ where }),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async create(dto) {
        const slug = await this.generateSlug(dto.title);
        return this.prisma.article.create({
            data: {
                type: dto.type,
                title: dto.title,
                excerpt: dto.excerpt,
                content: dto.content,
                featuredImage: dto.featuredImage,
                authorName: dto.authorName ?? 'Reporte Médico',
                slug,
                tags: dto.tagIds?.length
                    ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
                    : undefined,
            },
        });
    }
    async update(id, dto) {
        const { tagIds, ...fields } = dto;
        return this.prisma.article.update({
            where: { id },
            data: {
                title: fields.title,
                excerpt: fields.excerpt,
                content: fields.content,
                featuredImage: fields.featuredImage,
                authorName: fields.authorName,
                ...(tagIds !== undefined && {
                    tags: {
                        deleteMany: {},
                        create: tagIds.map((tagId) => ({ tagId })),
                    },
                }),
            },
        });
    }
    async setStatus(id, status) {
        return this.prisma.article.update({
            where: { id },
            data: {
                status,
                ...(status === client_1.ArticleStatus.PUBLISHED && { publishedAt: new Date() }),
            },
        });
    }
    async setRelevance(id, relevance) {
        return this.prisma.$transaction(async (tx) => {
            if (relevance === 1) {
                await tx.article.updateMany({
                    where: { relevance: 1, status: client_1.ArticleStatus.PUBLISHED, id: { not: id } },
                    data: { relevance: 2 },
                });
            }
            return tx.article.update({ where: { id }, data: { relevance } });
        });
    }
    async remove(id) {
        return this.prisma.article.delete({ where: { id } });
    }
    async submitPublic(dto) {
        const slug = await this.generateSlug(dto.title);
        const filteredSources = dto.sources?.filter((s) => !!s.title) ?? [];
        return this.prisma.article.create({
            data: {
                title: dto.title,
                excerpt: dto.excerpt,
                content: dto.content,
                authorName: dto.authorName,
                slug,
                type: client_1.ArticleType.MEDICAL_ARTICLE,
                status: client_1.ArticleStatus.PENDING,
                suggestedSpecialties: dto.suggestedSpecialties ?? [],
                tags: dto.tagIds?.length
                    ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
                    : undefined,
                sources: filteredSources.length > 0
                    ? {
                        create: filteredSources.map((s) => ({
                            title: s.title,
                            url: s.url ?? null,
                            order: s.order ?? 0,
                        })),
                    }
                    : undefined,
            },
        });
    }
    async approveSpecialty(articleId, specialtyName) {
        const article = await this.prisma.article.findUnique({ where: { id: articleId } });
        if (!article)
            throw new common_1.NotFoundException('Artículo no encontrado');
        const normalized = specialtyName.charAt(0).toUpperCase() + specialtyName.slice(1).trim();
        const allTags = await this.prisma.tag.findMany({
            select: { id: true, name: true, slug: true },
        });
        let tag = allTags.find((t) => this.stripAccents(t.name) === this.stripAccents(normalized)) ?? null;
        if (!tag) {
            const tagSlug = (0, slugify_1.default)(normalized, { lower: true, strict: true, locale: 'es' });
            tag = await this.prisma.tag.create({ data: { name: normalized, slug: tagSlug } });
        }
        await this.prisma.articleTag.upsert({
            where: { articleId_tagId: { articleId, tagId: tag.id } },
            create: { articleId, tagId: tag.id },
            update: {},
        });
        const updated = article.suggestedSpecialties.filter((s) => s.toLowerCase() !== specialtyName.toLowerCase());
        return this.prisma.article.update({
            where: { id: articleId },
            data: { suggestedSpecialties: updated },
            include: { tags: { include: { tag: true } } },
        });
    }
    async rejectSpecialty(articleId, specialtyName) {
        const article = await this.prisma.article.findUnique({ where: { id: articleId } });
        if (!article)
            throw new common_1.NotFoundException('Artículo no encontrado');
        const updated = article.suggestedSpecialties.filter((s) => s.toLowerCase() !== specialtyName.toLowerCase());
        return this.prisma.article.update({
            where: { id: articleId },
            data: { suggestedSpecialties: updated },
        });
    }
    async generateSlug(title) {
        const base = (0, slugify_1.default)(title, { lower: true, strict: true, locale: 'es' });
        let slug = base;
        let counter = 1;
        while (await this.prisma.article.findUnique({ where: { slug } })) {
            slug = `${base}-${counter++}`;
        }
        return slug;
    }
    stripAccents(str) {
        return str
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }
    buildOrderBy(sort) {
        const map = {
            publishedAt_desc: { publishedAt: 'desc' },
            createdAt_desc: { createdAt: 'desc' },
            relevance_asc: { relevance: 'asc' },
            views_desc: { viewsCount: 'desc' },
        };
        return map[sort] ?? { publishedAt: 'desc' };
    }
};
exports.ArticlesService = ArticlesService;
exports.ArticlesService = ArticlesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ArticlesService);
//# sourceMappingURL=articles.service.js.map