import { IsEnum, IsString, IsOptional, IsArray, IsUUID, MinLength, MaxLength } from 'class-validator'
import { ArticleType } from '@prisma/client'

export class CreateArticleDto {
  @IsEnum(ArticleType)
  type!: ArticleType

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string

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
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[]
}
