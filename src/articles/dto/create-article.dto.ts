import { IsEnum, IsString, IsOptional, IsArray, IsUUID, MinLength, MaxLength, IsInt, Min, Max, IsDateString } from 'class-validator'
import { ArticleType, ArticleStatus } from '@prisma/client'

export class CreateArticleDto {
  @IsEnum(ArticleType)
  type!: ArticleType

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  slug?: string

  @IsOptional()
  @IsString()
  @MaxLength(600)
  excerpt?: string

  @IsString()
  @MinLength(1)
  content!: string

  @IsOptional()
  @IsString()
  featuredImage?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  authorName?: string

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3)
  relevance?: number

  @IsOptional()
  @IsDateString()
  publishedAt?: string

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[]
}
