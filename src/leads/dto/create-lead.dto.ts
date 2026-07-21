import { IsString, IsOptional, IsEmail, IsUUID, IsEnum, MinLength, MaxLength } from 'class-validator'
import { DoctorPlan } from '@prisma/client'

/**
 * Captura de lead ANTES de Auth0 (pedido del cliente, 2026-07-21).
 * Deliberadamente corto: nombre, apellido, teléfono, email y especialidad.
 * Todo lo demás se completa después, ya con la cuenta creada.
 */
export class CreateLeadDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  firstName!: string

  @IsString()
  @MinLength(2)
  @MaxLength(60)
  lastName!: string

  @IsEmail()
  @MaxLength(160)
  email!: string

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  phone!: string

  @IsOptional()
  @IsUUID()
  specialtyId?: string

  /** Plan que estaba mirando — contexto para el equipo de ventas */
  @IsOptional()
  @IsEnum(DoctorPlan)
  interestPlan?: DoctorPlan
}
