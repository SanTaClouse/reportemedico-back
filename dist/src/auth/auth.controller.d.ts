import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
interface JwtRequest {
    user: {
        sub: string;
        role: string;
        name: string;
    };
}
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            role: "ADMIN";
        };
    }>;
    getMe(req: JwtRequest): Promise<{
        id: string;
        name: string | null;
        email: string;
        role: "ADMIN";
    } | null>;
}
export {};
