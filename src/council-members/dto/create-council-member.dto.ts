import { IsString, IsOptional, IsBoolean, IsInt, Min, MinLength, MaxLength } from 'class-validator'

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
  @IsString()
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
