import { IsString, IsOptional, IsArray, IsUUID, MinLength, MaxLength } from 'class-validator'

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string

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
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[]
}
