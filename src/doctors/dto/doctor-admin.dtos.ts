import {
  IsString, IsOptional, IsBoolean, IsEnum, IsDateString, MaxLength, IsUUID, IsArray,
} from 'class-validator'
import { DoctorStatus, DoctorPlan, BenefitType } from '@prisma/client'

/**
 * Normaliza una sugerencia de clínica del médico (07 §14): el admin la asocia a
 * una clínica del catálogo (existente o recién creada). El schedule pisa la tanda
 * sugerida si el admin la ajusta.
 */
export class ResolveClinicSuggestionDto {
  @IsUUID('4')
  clinicId!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  schedule?: string
}

export class UpdateDoctorStatusDto {
  @IsEnum(DoctorStatus)
  status!: DoctorStatus
}

export class UpdateDoctorPlanDto {
  @IsEnum(DoctorPlan)
  plan!: DoctorPlan

  // Notas del admin sobre cobro/condiciones (el cobro es manual y externo)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  planNotes?: string
}

export class UpdateDoctorVerificationDto {
  @IsBoolean()
  isVerified!: boolean

  @IsOptional()
  @IsString()
  @MaxLength(50)
  exequatur?: string
}

export class CreateDoctorBenefitDto {
  @IsEnum(BenefitType)
  type!: BenefitType

  @IsOptional()
  @IsDateString()
  deliveredAt?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}

export class UpdateDoctorBenefitDto {
  @IsOptional()
  @IsDateString()
  deliveredAt?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}

/**
 * Fusión de perfiles duplicados (07 §2). Se conserva `targetId` (su slug e
 * historia); `sourceId` se elimina tras transferir su auth0Sub, relaciones e
 * historial. `fromSource` lista los campos escalares cuyo valor gana el duplicado.
 */
export class MergeDoctorsDto {
  @IsUUID('4')
  targetId!: string

  @IsUUID('4')
  sourceId!: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fromSource?: string[]
}
