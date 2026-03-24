import { IsString, IsBoolean, IsOptional, IsUrl } from 'class-validator'

export class CreateAdDto {
  @IsString()
  title!: string

  @IsUrl()
  imageUrl!: string

  @IsUrl()
  link!: string

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
