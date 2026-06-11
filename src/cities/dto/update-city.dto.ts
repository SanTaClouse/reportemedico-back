import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'

export class UpdateCityDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string
}
