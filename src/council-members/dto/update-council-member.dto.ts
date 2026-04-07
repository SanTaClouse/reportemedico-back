import { IsString, IsOptional, IsBoolean, IsInt, Min, MinLength, MaxLength, IsUrl } from 'class-validator'

export class UpdateCouncilMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  role?: string

  @IsOptional()
  @IsString()
  photo?: string

  @IsOptional()
  @IsUrl({}, { message: 'El URL de perfil no es válido' })
  profileUrl?: string

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number
}
