import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  ValidateNested,
  IsInt,
  Min,
  IsUrl,
  IsEmail,
} from 'class-validator'
import { Type } from 'class-transformer'

export class SourceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string

  @IsOptional()
  @IsUrl({}, { message: 'La URL de la fuente no es válida' })
  url?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number
}

export class SubmitPublicDto {
  @IsString()
  @MinLength(10)
  @MaxLength(300)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(600)
  excerpt?: string

  @IsString()
  content!: string

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  authorName!: string

  @IsOptional()
  @IsString()
  featuredImage?: string

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  tagIds?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  suggestedSpecialties?: string[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SourceDto)
  sources?: SourceDto[]

  @IsOptional()
  @IsEmail()
  authorEmail?: string
}
