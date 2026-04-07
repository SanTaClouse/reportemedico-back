import { IsInt, Min, Max, IsOptional, ValidateIf } from 'class-validator'

export class SetRelevanceDto {
  // null = "Sin slot editorial" (publicado pero fuera del home)
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(1)
  @Max(5)
  relevance!: number | null
}
