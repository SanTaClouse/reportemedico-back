import { IsString, MinLength, MaxLength } from 'class-validator'

export class CreateInsuranceDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string
}
