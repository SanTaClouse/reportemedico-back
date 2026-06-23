import { IsEmail, IsOptional, IsString, MaxLength, IsArray, IsUUID } from 'class-validator'

export class CreateSubscriberDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  // Temas de interés (opcional): se suman a la suscripción para segmentar envíos (08 §1)
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[]
}
