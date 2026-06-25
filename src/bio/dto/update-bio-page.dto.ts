import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator'

export class UpdateBioPageDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string

  // Enviar "" o null para limpiar
  @IsOptional()
  @IsString()
  @MaxLength(160)
  subtitle?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string | null

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
