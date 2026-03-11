import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'

export class CreateTagDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string
}
