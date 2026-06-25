import { IsOptional, IsString, IsIn, MaxLength } from 'class-validator'

/** Evento público de tracking (vista de página o clic de enlace). Sin PII. */
export class TrackBioEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  slug?: string

  @IsOptional()
  @IsString()
  @MaxLength(512)
  referrer?: string

  @IsOptional()
  @IsIn(['mobile', 'desktop'])
  device?: 'mobile' | 'desktop'
}
