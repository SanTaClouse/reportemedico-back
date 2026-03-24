import { IsInt, Min, Max } from 'class-validator'

export class SetRelevanceDto {
  @IsInt()
  @Min(1)
  @Max(5)
  relevance!: number
}
