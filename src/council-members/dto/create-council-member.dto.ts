import { IsString, IsOptional, IsBoolean, IsInt, Min, MinLength, MaxLength, IsUrl } from 'class-validator'

export class CreateCouncilMemberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  role!: string

  @IsOptional()
  @IsString()
  photo?: string

  @IsOptional()
  @IsUrl({}, { message: 'El LinkedIn URL no es válido' })
  linkedinUrl?: string

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
