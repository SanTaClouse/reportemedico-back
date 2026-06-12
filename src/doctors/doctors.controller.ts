import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common'
import { DoctorStatus } from '@prisma/client'
import { DoctorsService } from './doctors.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CreateDoctorDto } from './dto/create-doctor.dto'
import { UpdateDoctorDto } from './dto/update-doctor.dto'
import {
  UpdateDoctorStatusDto, UpdateDoctorPlanDto, UpdateDoctorVerificationDto,
  CreateDoctorBenefitDto, UpdateDoctorBenefitDto,
} from './dto/doctor-admin.dtos'

@Controller('doctors')
export class DoctorsController {
  constructor(private doctorsService: DoctorsService) {}

  // ─── Público ────────────────────────────────────────────────────────────────

  // Umbral P7: combinaciones indexables para sitemap, programáticas y links
  @Get('indexable')
  getIndexable() {
    return this.doctorsService.getIndexableCombinations()
  }

  // Listado público ordenado para programáticas y página de clínica
  @Get('public-list')
  findPublicList(
    @Query('specialty') specialty?: string,
    @Query('city') city?: string,
    @Query('clinic') clinic?: string,
  ) {
    return this.doctorsService.findPublicList({
      specialtySlug: specialty,
      citySlug: city,
      clinicSlug: clinic,
    })
  }

  // Ficha pública (solo PUBLISHED; el resto → 404) — incluye médicos relacionados
  @Get('slug/:slug')
  findPublic(@Param('slug') slug: string) {
    return this.doctorsService.findPublicBySlug(slug)
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  @Get('pending-count')
  @UseGuards(JwtAuthGuard)
  countPending() {
    return this.doctorsService.countPending()
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query('status') status?: DoctorStatus,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.doctorsService.findAll({ status, search, page, limit })
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateDoctorDto) {
    return this.doctorsService.create(dto)
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.update(id, dto)
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateDoctorStatusDto) {
    return this.doctorsService.updateStatus(id, dto)
  }

  @Patch(':id/plan')
  @UseGuards(JwtAuthGuard)
  updatePlan(@Param('id') id: string, @Body() dto: UpdateDoctorPlanDto) {
    return this.doctorsService.updatePlan(id, dto)
  }

  @Patch(':id/verification')
  @UseGuards(JwtAuthGuard)
  updateVerification(@Param('id') id: string, @Body() dto: UpdateDoctorVerificationDto) {
    return this.doctorsService.updateVerification(id, dto)
  }

  @Post(':id/claim-token')
  @UseGuards(JwtAuthGuard)
  createClaimToken(@Param('id') id: string) {
    return this.doctorsService.createClaimToken(id)
  }

  // Beneficios premium (checklist de entrega)
  @Post(':id/benefits')
  @UseGuards(JwtAuthGuard)
  addBenefit(@Param('id') id: string, @Body() dto: CreateDoctorBenefitDto) {
    return this.doctorsService.addBenefit(id, dto)
  }

  @Patch(':id/benefits/:benefitId')
  @UseGuards(JwtAuthGuard)
  updateBenefit(
    @Param('id') id: string,
    @Param('benefitId') benefitId: string,
    @Body() dto: UpdateDoctorBenefitDto,
  ) {
    return this.doctorsService.updateBenefit(id, benefitId, dto)
  }

  @Delete(':id/benefits/:benefitId')
  @UseGuards(JwtAuthGuard)
  removeBenefit(@Param('id') id: string, @Param('benefitId') benefitId: string) {
    return this.doctorsService.removeBenefit(id, benefitId)
  }
}
