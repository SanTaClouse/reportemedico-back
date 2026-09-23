import {
  Body, Controller, DefaultValuePipe, Delete, Get, Header, Param, ParseIntPipe, ParseUUIDPipe,
  Patch, Post, Query, Request, Res, UseGuards,
} from '@nestjs/common'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import type { Response } from 'express'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { EventsService } from './events.service'
import { EventStaffService } from './event-staff.service'
import { RegisterEventDto } from './dto/register-event.dto'
import {
  CheckInDto, CreateStaffDto, CreateTestRegistrationDto, SendTestEmailDto, SetRegistrationStatusDto,
  TEST_EMAIL_TYPES, UpdateEventDto, UpdateRegistrationDto, UpdateStaffDto, type TestEmailType,
} from './dto/admin-event.dto'

interface JwtRequest {
  user: { sub: string; role: string; name: string }
}

// ─── Público ────────────────────────────────────────────────────────────────

@Controller('events')
export class EventsController {
  constructor(private events: EventsService) {}

  @Get(':slug')
  getPublic(@Param('slug') slug: string) {
    return this.events.getPublic(slug)
  }

  /** Inscripción. 10 por IP cada 10 min: alcanza para un consultorio que inscribe a varios. */
  @Post(':slug/registrations')
  @Throttle({ default: { limit: 10, ttl: 600000 } })
  register(@Param('slug') slug: string, @Body() dto: RegisterEventDto) {
    return this.events.register(slug, dto)
  }

  /** .ics para Apple / Outlook. `attendance` = DAY | EVENING | BOTH */
  @Get(':slug/calendar')
  async calendar(@Param('slug') slug: string, @Query('attendance') attendance: string, @Res() res: Response) {
    const ics = await this.events.calendarIcs(slug, attendance)
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `inline; filename="${slug}.ics"`)
    res.send(ics)
  }

  /** "Mi entrada" — el pase con QR de una inscripción aprobada */
  @Get(':slug/entry/:token')
  getEntry(@Param('slug') slug: string, @Param('token') token: string) {
    return this.events.getEntry(slug, token)
  }
}

// ─── Admin ──────────────────────────────────────────────────────────────────

@Controller('admin/events')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class EventsAdminController {
  constructor(private events: EventsService) {}

  @Get()
  list() {
    return this.events.listEvents()
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.events.getAdmin(id)
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEventDto) {
    return this.events.updateEvent(id, dto)
  }

  @Get(':id/registrations')
  registrations(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
    @Query('sector') sector?: string,
    @Query('part') part?: string,
    @Query('q') q?: string,
    @Query('vip') vip?: string,
    @Query('tests') tests?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit = 50,
  ) {
    return this.events.listRegistrations(id, {
      status, sector, part, q, vip: vip === 'true', tests: tests === 'true', page, limit,
    })
  }

  @Post(':id/registrations/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetRegistrationStatusDto) {
    return this.events.setStatus(id, dto)
  }

  @Patch(':id/registrations/:regId')
  updateRegistration(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('regId', ParseUUIDPipe) regId: string,
    @Body() dto: UpdateRegistrationDto,
  ) {
    return this.events.updateRegistration(id, regId, dto)
  }

  @Delete(':id/registrations/:regId')
  deleteRegistration(@Param('id', ParseUUIDPipe) id: string, @Param('regId', ParseUUIDPipe) regId: string) {
    return this.events.deleteRegistration(id, regId)
  }

  /** Reenvía el QR (la persona perdió el email, o lo pide en la puerta) */
  @Post(':id/registrations/:regId/resend-access')
  resendAccess(@Param('id', ParseUUIDPipe) id: string, @Param('regId', ParseUUIDPipe) regId: string) {
    return this.events.resendAccess(id, regId)
  }

  // ─── Sección de pruebas ────────────────────────────────────────────────────

  @Post(':id/tests')
  createTest(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateTestRegistrationDto) {
    return this.events.createTest(id, dto)
  }

  @Post(':id/tests/:regId/email')
  sendTestEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('regId', ParseUUIDPipe) regId: string,
    @Body() dto: SendTestEmailDto,
  ) {
    return this.events.sendTestEmail(id, regId, dto.type)
  }

  @Get(':id/tests/:regId/preview/:type')
  @Header('Content-Type', 'text/html; charset=utf-8')
  preview(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('regId', ParseUUIDPipe) regId: string,
    @Param('type') type: string,
  ) {
    const t = (TEST_EMAIL_TYPES as readonly string[]).includes(type) ? (type as TestEmailType) : 'received'
    return this.events.emailPreview(id, regId, t)
  }

  @Delete(':id/tests/check-ins')
  resetTestCheckIns(@Param('id', ParseUUIDPipe) id: string) {
    return this.events.resetTestCheckIns(id)
  }

  @Delete(':id/tests')
  deleteTests(@Param('id', ParseUUIDPipe) id: string) {
    return this.events.deleteTests(id)
  }
}

// ─── Personal de puerta ─────────────────────────────────────────────────────

@Controller('admin/event-staff')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class EventStaffController {
  constructor(private staff: EventStaffService) {}

  @Get()
  list() {
    return this.staff.list()
  }

  @Post()
  create(@Body() dto: CreateStaffDto) {
    return this.staff.create(dto)
  }

  @Patch(':userId')
  update(@Param('userId', ParseUUIDPipe) userId: string, @Body() dto: UpdateStaffDto) {
    return this.staff.update(userId, dto)
  }
}

// ─── Escáner (ADMIN y SCANNER) ──────────────────────────────────────────────

@Controller('access')
@UseGuards(JwtAuthGuard)
@Roles('ADMIN', 'SCANNER')
@SkipThrottle()
export class AccessController {
  constructor(private events: EventsService) {}

  @Get(':slug')
  info(@Param('slug') slug: string, @Request() req: JwtRequest) {
    return this.events.accessInfo(slug, req.user)
  }

  @Post(':slug/check-in')
  checkIn(@Param('slug') slug: string, @Body() dto: CheckInDto, @Request() req: JwtRequest) {
    return this.events.checkIn(slug, dto, req.user)
  }

  @Get(':slug/search')
  search(@Param('slug') slug: string, @Query('q') q: string = '', @Request() req: JwtRequest) {
    return this.events.search(slug, q, req.user)
  }

  @Get(':slug/live')
  live(@Param('slug') slug: string, @Request() req: JwtRequest) {
    return this.events.live(slug, req.user)
  }
}
