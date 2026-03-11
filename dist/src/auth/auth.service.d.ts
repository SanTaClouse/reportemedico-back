import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    login(email: string, password: string): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            role: "ADMIN";
        };
    }>;
    getMe(userId: string): Promise<{
        id: string;
        name: string | null;
        email: string;
        role: "ADMIN";
    } | null>;
}
