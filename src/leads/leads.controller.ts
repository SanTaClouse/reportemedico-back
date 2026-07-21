import {
  Controller, Get, Post, Param, Body, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe, NotFoundException,
} from '@nestjs/common'
import { LeadsService } from './leads.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { DoctorAuthGuard } from '../doctor-auth/doctor-auth.guard'
import { CreateLeadDto } from './dto/create-lead.dto'

@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  /** PÚBLICO: el médico deja sus datos antes de pasar por Auth0 */
  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto)
  }

  /**
   * Devuelve el lead para precargar el wizard después del alta en Auth0.
   * Va con sesión de médico: para cuando se llama, el usuario ya se autenticó,
   * así que no hace falta exponer datos de contacto en un endpoint abierto.
   */
  @Get(':id')
  @UseGuards(DoctorAuthGuard)
  async findOne(@Param('id') id: string) {
    const lead = await this.leadsService.findOne(id)
    if (!lead) throw new NotFoundException('Lead no encontrado')
    return lead
  }

  /** ADMIN: panel de ventas */
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('converted') converted?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.leadsService.findAll({
      converted: converted === undefined || converted === '' ? undefined : converted === 'true',
      page,
      limit,
    })
  }
}
