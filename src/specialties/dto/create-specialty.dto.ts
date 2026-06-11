import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'

export class CreateSpecialtyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string

  // Enum MedicalSpecialty de schema.org (ej: "Cardiovascular") — para JSON-LD
  @IsOptional()
  @IsString()
  @MaxLength(50)
  schemaOrgValue?: string
}
