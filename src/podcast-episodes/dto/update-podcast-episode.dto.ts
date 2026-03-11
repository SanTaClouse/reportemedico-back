import { IsString, IsOptional, IsBoolean, IsInt, Min, MinLength, MaxLength } from 'class-validator'

export class UpdatePodcastEpisodeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  youtubeId?: string

  @IsOptional()
  @IsString()
  thumbnailUrl?: string

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number
}
