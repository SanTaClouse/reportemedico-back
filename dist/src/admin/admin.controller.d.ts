import { ArticlesService } from '../articles/articles.service';
export declare class AdminController {
    private articlesService;
    constructor(articlesService: ArticlesService);
    getArticleById(id: string): Promise<{
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
    getArticles(page: string, limit: string, type: string, status: string, relevance: string, tag: string, search: string, sort: string): Promise<{
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
}
