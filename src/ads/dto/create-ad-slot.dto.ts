import { IsString, IsBoolean, IsOptional, Matches } from 'class-validator'

export class CreateAdSlotDto {
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'El nombre del slot solo puede contener letras minúsculas, números y guiones bajos',
  })
  name!: string

  @IsString()
  @IsOptional()
  description?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
