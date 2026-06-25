import { IsString, IsOptional, IsBoolean, MaxLength, Matches, IsDateString } from 'class-validator'

export class CreateBioLinkDto {
  @IsString()
  @MaxLength(120)
  label!: string

  @IsString()
  @MaxLength(2048)
  @Matches(/^(https?:\/\/|mailto:|tel:)/i, {
    message: 'El enlace debe empezar con http(s)://, mailto: o tel:',
  })
  url!: string

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsDateString()
  startsAt?: string

  @IsOptional()
  @IsDateString()
  endsAt?: string
}
