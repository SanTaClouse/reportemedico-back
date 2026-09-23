import { Module } from '@nestjs/common'
import { EmailModule } from '../email/email.module'
import { EventsService } from './events.service'
import { EventStaffService } from './event-staff.service'
import { AccessController, EventStaffController, EventsAdminController, EventsController } from './events.controller'

/** Eventos: Foro de Salud 5.0 y siguientes (docs/v2/11) */
@Module({
  imports: [EmailModule],
  controllers: [EventsController, EventsAdminController, EventStaffController, AccessController],
  providers: [EventsService, EventStaffService],
})
export class EventsModule {}
