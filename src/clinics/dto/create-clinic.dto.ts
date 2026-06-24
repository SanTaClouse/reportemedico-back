import { IsString, IsOptional, IsNumber, IsUUID, Min, Max, MinLength, MaxLength } from 'class-validator'

export class CreateClinicDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string

  @IsString()
  @MinLength(5)
  @MaxLength(300)
  address!: string

  @IsUUID()
  cityId!: string

  // Coords opcionales: el admin puede crear la clínica sin ubicarla y mapearla
  // después (queda flageada como "sin ubicación" en el panel).
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string
}
