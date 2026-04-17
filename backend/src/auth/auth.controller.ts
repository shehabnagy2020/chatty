import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { username: string; password: string; rememberMe?: boolean }) {
    const result = await this.authService.register(
      body.username,
      body.password,
      body.rememberMe ?? true,
    );
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { username: string; password: string; rememberMe?: boolean }) {
    const result = await this.authService.login(
      body.username,
      body.password,
      body.rememberMe ?? true,
    );
    return result;
  }
}
