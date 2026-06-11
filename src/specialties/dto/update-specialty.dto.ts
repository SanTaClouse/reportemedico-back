import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'

export class UpdateSpecialtyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  schemaOrgValue?: string
}
