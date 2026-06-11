import {
  IsString, IsOptional, IsEmail, IsBoolean, IsArray, IsUUID,
  MinLength, MaxLength, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { DoctorClinicInput } from './create-doctor.dto'

// El slug NO se actualiza nunca por acá (inmutable post-publicación, 04 §2).
// Estado, plan y verificación tienen endpoints propios con sus reglas.
export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  firstName?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  lastName?: string

  @IsOptional()
  @IsString()
  @MaxLength(10)
  title?: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phonePublic?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneInternal?: string

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneOffice?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  instagram?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  exequatur?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  languages?: string[]

  @IsOptional()
  @IsBoolean()
  telehealth?: boolean

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  specialtyIds?: string[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorClinicInput)
  clinics?: DoctorClinicInput[]

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  insuranceIds?: string[]
}
