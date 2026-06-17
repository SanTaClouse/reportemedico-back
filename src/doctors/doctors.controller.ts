import {
  Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards,
  ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common'
import { DoctorStatus } from '@prisma/client'
import { DoctorsService } from './doctors.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { DoctorAuthGuard } from '../doctor-auth/doctor-auth.guard'
import { Auth0User } from '../doctor-auth/current-doctor.decorator'
import type { Auth0Payload } from '../doctor-auth/auth0.strategy'
import { CreateDoctorDto } from './dto/create-doctor.dto'
import { UpdateDoctorDto } from './dto/update-doctor.dto'
import {
  UpdateDoctorStatusDto, UpdateDoctorPlanDto, UpdateDoctorVerificationDto,
  CreateDoctorBenefitDto, UpdateDoctorBenefitDto,
} from './dto/doctor-admin.dtos'

@Controller('doctors')
export class DoctorsController {
  constructor(private doctorsService: DoctorsService) {}

  // ─── Área del médico (sesión Auth0) — antes de las rutas con :id ───────────

  /** Perfil propio; si no existe, busca un candidato a reclamo por email (B2) */
  @Get('me')
  @UseGuards(DoctorAuthGuard)
  async findOwn(@Auth0User() user: Auth0Payload) {
    const doctor = await this.doctorsService.findOwn(user.sub)
    if (doctor) return { doctor, claimCandidate: null }
    const claimCandidate = await this.doctorsService.findClaimCandidate(user.email, user.emailVerified)
    return { doctor: null, claimCandidate }
  }

  /** Crear/guardar el perfil propio (borrador) */
  @Put('me')
  @UseGuards(DoctorAuthGuard)
  upsertOwn(@Auth0User() user: Auth0Payload, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.upsertOwn(user.sub, user.email, dto)
  }

  /** Enviar el perfil propio a revisión (DRAFT → PENDING) */
  @Post('me/submit')
  @UseGuards(DoctorAuthGuard)
  submitOwn(@Auth0User() user: Auth0Payload) {
    return this.doctorsService.submitOwn(user.sub)
  }

  /** Reclamar un perfil con el link de invitación (B1) */
  @Post('me/claim-link')
  @UseGuards(DoctorAuthGuard)
  claimByLink(@Auth0User() user: Auth0Payload, @Body('token') token: string) {
    return this.doctorsService.claimByLink(user.sub, token)
  }

  /** Reclamar el perfil que coincide con mi email verificado (B2) */
  @Post('me/claim-email')
  @UseGuards(DoctorAuthGuard)
  claimByEmail(@Auth0User() user: Auth0Payload) {
    return this.doctorsService.claimByEmail(user.sub, user.email, user.emailVerified)
  }

  // ─── Público ────────────────────────────────────────────────────────────────

  // Umbral P7: combinaciones indexables para sitemap, programáticas y links
  @Get('indexable')
  getIndexable() {
    return this.doctorsService.getIndexableCombinations()
  }

  // Búsqueda pública con filtros componibles (05 §2) — siempre PUBLISHED
  @Get('search')
  search(
    @Query('seguro') insurance?: string,
    @Query('especialidad') specialty?: string,
    @Query('ciudad') city?: string,
    @Query('clinica') clinic?: string,
    @Query('q') q?: string,
    @Query('modalidad') modalidad?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
  ) {
    return this.doctorsService.search({
      insurance,
      specialty,
      city,
      clinic,
      q,
      telehealth: modalidad === 'teleconsulta',
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      page,
    })
  }

  // Typeahead: médicos + clínicas (05 §2)
  @Get('suggest')
  suggest(@Query('q') q = '') {
    return this.doctorsService.suggest(q)
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

  // Panel de engagement del admin (07 §7)
  @Get('engagement')
  @UseGuards(JwtAuthGuard)
  getEngagement() {
    return this.doctorsService.getEngagement()
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
