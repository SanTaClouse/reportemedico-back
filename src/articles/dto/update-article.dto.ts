import { IsString, IsOptional, IsArray, IsUUID, MinLength, MaxLength, IsEnum, IsInt, Min, Max, IsDateString, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { ArticleStatus } from '@prisma/client'

class ArticleSourceDto {
  @IsString()
  @MaxLength(300)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string

  @IsOptional()
  @IsInt()
  order?: number
}

class SeoMetadataDto {
  @IsOptional()
  @IsString()
  @MaxLength(70)
  metaTitle?: string

  @IsOptional()
  @IsString()
  @MaxLength(170)
  metaDescription?: string
}

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  slug?: string

  @IsOptional()
  @IsString()
  @MaxLength(600)
  excerpt?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string

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
  @Max(5)
  relevance?: number

  @IsOptional()
  @IsDateString()
  publishedAt?: string

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticleSourceDto)
  sources?: ArticleSourceDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetadataDto)
  seoMetadata?: SeoMetadataDto
}
