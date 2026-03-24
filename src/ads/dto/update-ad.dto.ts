import { IsString, IsBoolean, IsOptional, IsUrl } from 'class-validator'

export class UpdateAdDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsUrl()
  @IsOptional()
  imageUrl?: string

  @IsUrl()
  @IsOptional()
  link?: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
