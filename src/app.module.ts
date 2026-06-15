import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { ArticlesModule } from './articles/articles.module'
import { TagsModule } from './tags/tags.module'
import { MediaModule } from './media/media.module'
import { PrintEditionsModule } from './print-editions/print-editions.module'
import { PodcastEpisodesModule } from './podcast-episodes/podcast-episodes.module'
import { AdminModule } from './admin/admin.module'
import { CouncilMembersModule } from './council-members/council-members.module'
import { AdsModule } from './ads/ads.module'
import { EmailModule } from './email/email.module'
// V2 — Guía Médica
import { DoctorAuthModule } from './doctor-auth/doctor-auth.module'
import { DoctorsModule } from './doctors/doctors.module'
import { EngagementModule } from './engagement/engagement.module'
import { RevalidationModule } from './revalidation/revalidation.module'
import { SpecialtiesModule } from './specialties/specialties.module'
import { ClinicsModule } from './clinics/clinics.module'
import { InsurancesModule } from './insurances/insurances.module'
import { CitiesModule } from './cities/cities.module'
import { ProgrammaticContentModule } from './programmatic-content/programmatic-content.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,   // ventana de 1 minuto
        limit: 120,   // 120 req/min por IP para rutas públicas (~2 req/seg)
      },
    ]),
    PrismaModule,
    AuthModule,
    ArticlesModule,
    TagsModule,
    MediaModule,
    PrintEditionsModule,
    PodcastEpisodesModule,
    AdminModule,
    CouncilMembersModule,
    AdsModule,
    EmailModule,
    // V2 — Guía Médica
    DoctorAuthModule,
    DoctorsModule,
    EngagementModule,
    RevalidationModule,
    SpecialtiesModule,
    ClinicsModule,
    InsurancesModule,
    CitiesModule,
    ProgrammaticContentModule,
  ],
})
export class AppModule {}
