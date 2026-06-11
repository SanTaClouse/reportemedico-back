import { IsString, IsOptional, IsBoolean, IsEnum, IsDateString, MaxLength } from 'class-validator'
import { DoctorStatus, DoctorPlan, BenefitType } from '@prisma/client'

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
