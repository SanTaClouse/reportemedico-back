import { IsString, IsOptional, IsInt, Min } from 'class-validator'

export class AddGalleryImageDto {
  @IsString()
  mediaId!: string

  @IsOptional()
  @IsString()
  caption?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number
}
