import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/** Protege endpoints del área del médico. Convive con JwtAuthGuard (admin). */
@Injectable()
export class DoctorAuthGuard extends AuthGuard('auth0') {}
