import { ArticleType } from '@prisma/client';
export declare class CreateArticleDto {
    type: ArticleType;
    title: string;
    excerpt?: string;
    content: string;
    featuredImage?: string;
    authorName?: string;
    tagIds?: string[];
}
