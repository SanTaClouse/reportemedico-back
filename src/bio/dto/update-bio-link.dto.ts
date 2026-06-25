import { IsString, IsOptional, IsBoolean, MaxLength, Matches, IsDateString } from 'class-validator'

export class UpdateBioLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Matches(/^(https?:\/\/|mailto:|tel:)/i, {
    message: 'El enlace debe empezar con http(s)://, mailto: o tel:',
  })
  url?: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  // Enviar null para limpiar la programación
  @IsOptional()
  @IsDateString()
  startsAt?: string | null

  @IsOptional()
  @IsDateString()
  endsAt?: string | null
}
