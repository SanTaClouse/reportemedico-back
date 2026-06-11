import { IsString, MinLength, MaxLength } from 'class-validator'

export class CreateCityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string
}
