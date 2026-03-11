import { Module } from '@nestjs/common'
import { CouncilMembersController } from './council-members.controller'
import { CouncilMembersService } from './council-members.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [CouncilMembersController],
  providers: [CouncilMembersService],
})
export class CouncilMembersModule {}
