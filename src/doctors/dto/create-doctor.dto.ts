import {
  IsString, IsOptional, IsEmail, IsBoolean, IsArray, IsUUID, IsEnum,
  MinLength, MaxLength, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { DoctorStatus, DoctorPlan } from '@prisma/client'

export class DoctorClinicInput {
  @IsUUID()
  clinicId!: string

  // Tanda de consulta en ESTA clínica: "Lunes a viernes 8:00–12:00"
  @IsOptional()
  @IsString()
  @MaxLength(200)
  schedule?: string
}

export class CreateDoctorDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  firstName!: string

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  lastName!: string

  // "Dr." / "Dra."
  @IsOptional()
  @IsString()
  @MaxLength(10)
  title?: string

  @IsOptional()
  @IsEmail()
  email?: string

  // WhatsApp público (botón CTA)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phonePublic?: string

  // Solo uso interno del admin
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
  @IsBoolean()
  isVerified?: boolean

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  languages?: string[]

  @IsOptional()
  @IsBoolean()
  telehealth?: boolean

  @IsOptional()
  @IsEnum(DoctorStatus)
  status?: DoctorStatus

  @IsOptional()
  @IsEnum(DoctorPlan)
  plan?: DoctorPlan

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  planNotes?: string

  // Orden importa: la primera es la especialidad principal de la ficha
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
