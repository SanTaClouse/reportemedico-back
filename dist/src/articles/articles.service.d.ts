import { ArticleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SubmitPublicDto } from './dto/submit-public.dto';
export declare class ArticlesService {
    private prisma;
    constructor(prisma: PrismaService);
    getHome(): Promise<{
        hero: ({
            tags: ({
                tag: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    createdAt: Date;
                };
            } & {
                articleId: string;
                tagId: string;
            })[];
        } & {
            id: string;
            slug: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.ArticleType;
            title: string;
            excerpt: string | null;
            content: string;
            featuredImage: string | null;
            authorName: string;
            suggestedSpecialties: string[];
            authorPhoto: string | null;
            status: import(".prisma/client").$Enums.ArticleStatus;
            relevance: number;
            viewsCount: number;
            publishedAt: Date | null;
        }) | null;
        featured: ({
            tags: ({
                tag: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    createdAt: Date;
                };
            } & {
                articleId: string;
                tagId: string;
            })[];
        } & {
            id: string;
            slug: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.ArticleType;
            title: string;
            excerpt: string | null;
            content: string;
            featuredImage: string | null;
            authorName: string;
            suggestedSpecialties: string[];
            authorPhoto: string | null;
            status: import(".prisma/client").$Enums.ArticleStatus;
            relevance: number;
            viewsCount: number;
            publishedAt: Date | null;
        })[];
        latest: ({
            tags: ({
                tag: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    createdAt: Date;
                };
            } & {
                articleId: string;
                tagId: string;
            })[];
        } & {
            id: string;
            slug: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.ArticleType;
            title: string;
            excerpt: string | null;
            content: string;
            featuredImage: string | null;
            authorName: string;
            suggestedSpecialties: string[];
            authorPhoto: string | null;
            status: import(".prisma/client").$Enums.ArticleStatus;
            relevance: number;
            viewsCount: number;
            publishedAt: Date | null;
        })[];
        medicalArticles: ({
            tags: ({
                tag: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    createdAt: Date;
                };
            } & {
                articleId: string;
                tagId: string;
            })[];
        } & {
            id: string;
            slug: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.ArticleType;
            title: string;
            excerpt: string | null;
            content: string;
            featuredImage: string | null;
            authorName: string;
            suggestedSpecialties: string[];
            authorPhoto: string | null;
            status: import(".prisma/client").$Enums.ArticleStatus;
            relevance: number;
            viewsCount: number;
            publishedAt: Date | null;
        })[];
    }>;
    findPublished(page?: number, limit?: number, type?: string, tagSlug?: string): Promise<{
        data: ({
            tags: ({
                tag: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    createdAt: Date;
                };
            } & {
                articleId: string;
                tagId: string;
            })[];
        } & {
            id: string;
            slug: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.ArticleType;
            title: string;
            excerpt: string | null;
            content: string;
            featuredImage: string | null;
            authorName: string;
            suggestedSpecialties: string[];
            authorPhoto: string | null;
            status: import(".prisma/client").$Enums.ArticleStatus;
            relevance: number;
            viewsCount: number;
            publishedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findBySlug(slug: string): Promise<{
        seoMetadata: {
            id: string;
            articleId: string;
            metaTitle: string | null;
            metaDescription: string | null;
            ogImage: string | null;
        } | null;
        sources: {
            id: string;
            title: string;
            url: string | null;
            order: number;
            articleId: string;
        }[];
        tags: ({
            tag: {
                id: string;
                name: string;
                slug: string;
                description: string | null;
                createdAt: Date;
            };
        } & {
            articleId: string;
            tagId: string;
        })[];
        relatedFrom: ({
            relatedArticle: {
                tags: ({
                    tag: {
                        id: string;
                        name: string;
                        slug: string;
                        description: string | null;
                        createdAt: Date;
                    };
                } & {
                    articleId: string;
                    tagId: string;
                })[];
            } & {
                id: string;
                slug: string;
                createdAt: Date;
                updatedAt: Date;
                type: import(".prisma/client").$Enums.ArticleType;
                title: string;
                excerpt: string | null;
                content: string;
                featuredImage: string | null;
                authorName: string;
                suggestedSpecialties: string[];
                authorPhoto: string | null;
                status: import(".prisma/client").$Enums.ArticleStatus;
                relevance: number;
                viewsCount: number;
                publishedAt: Date | null;
            };
        } & {
            articleId: string;
            relatedArticleId: string;
        })[];
    } & {
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ArticleType;
        title: string;
        excerpt: string | null;
        content: string;
        featuredImage: string | null;
        authorName: string;
        suggestedSpecialties: string[];
        authorPhoto: string | null;
        status: import(".prisma/client").$Enums.ArticleStatus;
        relevance: number;
        viewsCount: number;
        publishedAt: Date | null;
    }>;
    incrementViews(slug: string): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ArticleType;
        title: string;
        excerpt: string | null;
        content: string;
        featuredImage: string | null;
        authorName: string;
        suggestedSpecialties: string[];
        authorPhoto: string | null;
        status: import(".prisma/client").$Enums.ArticleStatus;
        relevance: number;
        viewsCount: number;
        publishedAt: Date | null;
    }>;
    findByIdAdmin(id: string): Promise<{
        seoMetadata: {
            id: string;
            articleId: string;
            metaTitle: string | null;
            metaDescription: string | null;
            ogImage: string | null;
        } | null;
        sources: {
            id: string;
            title: string;
            url: string | null;
            order: number;
            articleId: string;
        }[];
        tags: ({
            tag: {
                id: string;
                name: string;
                slug: string;
                description: string | null;
                createdAt: Date;
            };
        } & {
            articleId: string;
            tagId: string;
        })[];
    } & {
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ArticleType;
        title: string;
        excerpt: string | null;
        content: string;
        featuredImage: string | null;
        authorName: string;
        suggestedSpecialties: string[];
        authorPhoto: string | null;
        status: import(".prisma/client").$Enums.ArticleStatus;
        relevance: number;
        viewsCount: number;
        publishedAt: Date | null;
    }>;
    findAllAdmin(params: {
        page?: number;
        limit?: number;
        type?: string;
        status?: string;
        relevance?: number;
        tag?: string;
        search?: string;
        sort?: string;
    }): Promise<{
        data: ({
            tags: ({
                tag: {
                    id: string;
                    name: string;
                    slug: string;
                    description: string | null;
                    createdAt: Date;
                };
            } & {
                articleId: string;
                tagId: string;
            })[];
        } & {
            id: string;
            slug: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.ArticleType;
            title: string;
            excerpt: string | null;
            content: string;
            featuredImage: string | null;
            authorName: string;
            suggestedSpecialties: string[];
            authorPhoto: string | null;
            status: import(".prisma/client").$Enums.ArticleStatus;
            relevance: number;
            viewsCount: number;
            publishedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    create(dto: CreateArticleDto): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ArticleType;
        title: string;
        excerpt: string | null;
        content: string;
        featuredImage: string | null;
        authorName: string;
        suggestedSpecialties: string[];
        authorPhoto: string | null;
        status: import(".prisma/client").$Enums.ArticleStatus;
        relevance: number;
        viewsCount: number;
        publishedAt: Date | null;
    }>;
    update(id: string, dto: UpdateArticleDto): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ArticleType;
        title: string;
        excerpt: string | null;
        content: string;
        featuredImage: string | null;
        authorName: string;
        suggestedSpecialties: string[];
        authorPhoto: string | null;
        status: import(".prisma/client").$Enums.ArticleStatus;
        relevance: number;
        viewsCount: number;
        publishedAt: Date | null;
    }>;
    setStatus(id: string, status: ArticleStatus): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ArticleType;
        title: string;
        excerpt: string | null;
        content: string;
        featuredImage: string | null;
        authorName: string;
        suggestedSpecialties: string[];
        authorPhoto: string | null;
        status: import(".prisma/client").$Enums.ArticleStatus;
        relevance: number;
        viewsCount: number;
        publishedAt: Date | null;
    }>;
    setRelevance(id: string, relevance: number): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ArticleType;
        title: string;
        excerpt: string | null;
        content: string;
        featuredImage: string | null;
        authorName: string;
        suggestedSpecialties: string[];
        authorPhoto: string | null;
        status: import(".prisma/client").$Enums.ArticleStatus;
        relevance: number;
        viewsCount: number;
        publishedAt: Date | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ArticleType;
        title: string;
        excerpt: string | null;
        content: string;
        featuredImage: string | null;
        authorName: string;
        suggestedSpecialties: string[];
        authorPhoto: string | null;
        status: import(".prisma/client").$Enums.ArticleStatus;
        relevance: number;
        viewsCount: number;
        publishedAt: Date | null;
    }>;
    submitPublic(dto: SubmitPublicDto): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ArticleType;
        title: string;
        excerpt: string | null;
        content: string;
        featuredImage: string | null;
        authorName: string;
        suggestedSpecialties: string[];
        authorPhoto: string | null;
        status: import(".prisma/client").$Enums.ArticleStatus;
        relevance: number;
        viewsCount: number;
        publishedAt: Date | null;
    }>;
    approveSpecialty(articleId: string, specialtyName: string): Promise<{
        tags: ({
            tag: {
                id: string;
                name: string;
                slug: string;
                description: string | null;
                createdAt: Date;
            };
        } & {
            articleId: string;
            tagId: string;
        })[];
    } & {
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ArticleType;
        title: string;
        excerpt: string | null;
        content: string;
        featuredImage: string | null;
        authorName: string;
        suggestedSpecialties: string[];
        authorPhoto: string | null;
        status: import(".prisma/client").$Enums.ArticleStatus;
        relevance: number;
        viewsCount: number;
        publishedAt: Date | null;
    }>;
    rejectSpecialty(articleId: string, specialtyName: string): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.ArticleType;
        title: string;
        excerpt: string | null;
        content: string;
        featuredImage: string | null;
        authorName: string;
        suggestedSpecialties: string[];
        authorPhoto: string | null;
        status: import(".prisma/client").$Enums.ArticleStatus;
        relevance: number;
        viewsCount: number;
        publishedAt: Date | null;
    }>;
    private generateSlug;
    private stripAccents;
    private buildOrderBy;
}
