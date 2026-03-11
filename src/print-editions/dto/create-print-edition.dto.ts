import { IsInt, IsString, IsOptional, IsBoolean, IsDateString, Min, MaxLength } from 'class-validator'

export class CreatePrintEditionDto {
  @IsInt()
  @Min(1)
  editionNumber!: number

  @IsString()
  @MaxLength(200)
  title!: string

  @IsString()
  coverImage!: string

  @IsString()
  issuuUrl!: string

  @IsDateString()
  publishedAt!: string

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean
}
