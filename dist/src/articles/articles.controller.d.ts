import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { SubmitPublicDto } from './dto/submit-public.dto';
import { SetStatusDto } from './dto/set-status.dto';
import { SetRelevanceDto } from './dto/set-relevance.dto';
import { SpecialtyActionDto } from './dto/specialty-action.dto';
export declare class ArticlesController {
    private articlesService;
    constructor(articlesService: ArticlesService);
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
    getNews(page: string, limit: string): Promise<{
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
    getMedical(page: string, limit: string): Promise<{
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
    getByTag(slug: string, page: string): Promise<{
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
    findAll(page: string, limit: string): Promise<{
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
    findOne(slug: string): Promise<{
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
    incrementView(slug: string): Promise<{
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
    setStatus(id: string, dto: SetStatusDto): Promise<{
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
    setRelevance(id: string, dto: SetRelevanceDto): Promise<{
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
    approveSpecialty(id: string, dto: SpecialtyActionDto): Promise<{
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
    rejectSpecialty(id: string, dto: SpecialtyActionDto): Promise<{
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
}
