import {
  IsString, IsOptional, IsEmail, IsEnum, IsBoolean, IsInt, IsIn, IsUUID, IsDateString,
  MinLength, MaxLength, Min, ArrayMinSize, ArrayMaxSize, IsArray,
} from 'class-validator'
import { EventAttendance, EventPart, EventRegistrationStatus } from '@prisma/client'

/** Configuración operativa del evento, editable desde el admin */
export class UpdateEventDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(160)
  name?: string

  @IsOptional() @IsString() @MinLength(3) @MaxLength(160)
  venueName?: string

  @IsOptional() @IsString() @MaxLength(200)
  venueAddress?: string

  @IsOptional() @IsString() @MaxLength(500)
  mapsUrl?: string

  @IsOptional() @IsString() @MinLength(3) @MaxLength(80)
  dayTitle?: string

  @IsOptional() @IsDateString()
  dayStartsAt?: string

  @IsOptional() @IsDateString()
  dayEndsAt?: string

  /** null = sin cupo de referencia */
  @IsOptional() @IsInt() @Min(0)
  dayCapacity?: number | null

  @IsOptional() @IsString() @MinLength(3) @MaxLength(80)
  eveningTitle?: string

  @IsOptional() @IsString() @MaxLength(120)
  eveningVenue?: string

  @IsOptional() @IsDateString()
  eveningStartsAt?: string

  @IsOptional() @IsDateString()
  eveningEndsAt?: string

  @IsOptional() @IsInt() @Min(0)
  eveningCapacity?: number | null

  @IsOptional() @IsBoolean()
  registrationOpen?: boolean

  @IsOptional() @IsDateString()
  qrSendAt?: string
}

export class SetRegistrationStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2000)
  @IsUUID('all', { each: true })
  ids!: string[]

  @IsEnum(EventRegistrationStatus)
  status!: EventRegistrationStatus
}

export class UpdateRegistrationDto {
  @IsOptional() @IsBoolean()
  isVip?: boolean
}

/** Sección de pruebas: inscripción ya aprobada, con QR, que no cuenta en los números */
export class CreateTestRegistrationDto {
  @IsString() @MinLength(2) @MaxLength(60)
  firstName!: string

  @IsString() @MinLength(2) @MaxLength(60)
  lastName!: string

  @IsEmail() @MaxLength(160)
  email!: string

  @IsEnum(EventAttendance)
  attendance!: EventAttendance

  @IsOptional() @IsBoolean()
  isVip?: boolean
}

export const TEST_EMAIL_TYPES = ['received', 'approved', 'access'] as const
export type TestEmailType = (typeof TEST_EMAIL_TYPES)[number]

export class SendTestEmailDto {
  @IsIn(TEST_EMAIL_TYPES)
  type!: TestEmailType
}

// ─── Escáner ────────────────────────────────────────────────────────────────

export class CheckInDto {
  /** Contenido leído del QR (la URL de "Mi entrada" o el token solo) */
  @IsOptional() @IsString() @MaxLength(400)
  code?: string

  /** Búsqueda manual: la persona no trae el QR */
  @IsOptional() @IsUUID()
  registrationId?: string

  @IsEnum(EventPart)
  part!: EventPart

  /** Dejar pasar aunque se haya inscrito solo a la otra parte del evento */
  @IsOptional() @IsBoolean()
  force?: boolean
}

// ─── Personal de puerta (rol SCANNER) ───────────────────────────────────────

export class CreateStaffDto {
  @IsString() @MinLength(2) @MaxLength(80)
  name!: string

  @IsEmail() @MaxLength(160)
  email!: string

  @IsString() @MinLength(8) @MaxLength(100)
  password!: string
}

export class UpdateStaffDto {
  @IsOptional() @IsBoolean()
  isActive?: boolean

  @IsOptional() @IsString() @MinLength(8) @MaxLength(100)
  password?: string
}
