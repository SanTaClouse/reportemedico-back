import { IsInt, IsString, IsOptional, IsBoolean, IsDateString, Min, MaxLength } from 'class-validator'

export class UpdatePrintEditionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  editionNumber?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  coverImage?: string

  @IsOptional()
  @IsString()
  issuuUrl?: string

  @IsOptional()
  @IsDateString()
  publishedAt?: string

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean
}
