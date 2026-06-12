import { IsUUID, IsOptional, IsIn } from 'class-validator'

export class WhatsAppClickDto {
  @IsUUID()
  doctorId!: string

  @IsOptional()
  @IsIn(['profile', 'search-card', 'clinic-page'])
  source?: string
}
