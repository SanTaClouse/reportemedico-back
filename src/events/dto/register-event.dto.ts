import { IsString, IsOptional, IsEmail, IsUUID, IsEnum, MinLength, MaxLength } from 'class-validator'
import { EventAttendance, EventSector } from '@prisma/client'

/**
 * Inscripción pública al evento (docs/v2/11 §5). Pensada para completarse en
 * el celular en menos de un minuto: todo lo que no es imprescindible es opcional.
 */
export class RegisterEventDto {
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
  @MinLength(7)
  @MaxLength(30)
  phone!: string

  @IsEnum(EventSector)
  sector!: EventSector

  /** Solo se guarda si sector = DOCTOR */
  @IsOptional()
  @IsUUID()
  specialtyId?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  institution?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  position?: string

  @IsEnum(EventAttendance)
  attendance!: EventAttendance

  /** Honeypot: campo invisible para humanos. Si llega con texto, es un bot. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string
}
