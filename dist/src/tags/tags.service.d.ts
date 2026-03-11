import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
export declare class TagsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Prisma.PrismaPromise<({
        _count: {
            articles: number;
        };
    } & {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        createdAt: Date;
    })[]>;
    findBySlug(slug: string): Prisma.Prisma__TagClient<({
        articles: ({
            article: {
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
            tagId: string;
        })[];
    } & {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        createdAt: Date;
    }) | null, null, import("@prisma/client/runtime/library").DefaultArgs>;
    checkExists(name: string): Promise<{
        exists: boolean;
        tag: {
            id: string;
            name: string;
            slug: string;
            description: string | null;
        } | null;
    }>;
    private stripAccents;
    create(dto: CreateTagDto): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        createdAt: Date;
    }>;
    update(id: string, dto: UpdateTagDto): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        createdAt: Date;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        slug: string;
        description: string | null;
        createdAt: Date;
    }>;
}
