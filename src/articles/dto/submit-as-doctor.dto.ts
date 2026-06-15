import {
  IsString, IsOptional, IsArray, IsUUID, MinLength, MaxLength, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { SourceDto } from './submit-public.dto'

/**
 * Envío de artículo por un médico logueado (06 §6): SOLO el contenido.
 * Nombre, email y foto del autor se derivan del perfil — no se re-cargan.
 */
export class SubmitAsDoctorDto {
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
}
