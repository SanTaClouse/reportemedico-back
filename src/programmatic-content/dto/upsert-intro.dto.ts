import { IsString, IsUUID, MaxLength } from 'class-validator'

export class UpsertIntroDto {
  @IsUUID()
  specialtyId!: string

  @IsUUID()
  cityId!: string

  // Vacío = borrar el texto editorial de esa combinación
  @IsString()
  @MaxLength(5000)
  introText!: string
}
