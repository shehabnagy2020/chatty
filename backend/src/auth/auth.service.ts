import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';

interface JwtPayload {
  userId: number;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(
    username: string,
    password: string,
  ): Promise<{ accessToken: string; username: string }> {
    const existing = await this.userRepo.findOne({ where: { username } });
    if (existing) {
      throw new UnauthorizedException('Username already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({ username, password: hashedPassword });
    await this.userRepo.save(user);
    const accessToken = this.jwtService.sign({
      userId: user.id,
      username: user.username,
    });
    return { accessToken, username: user.username };
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ accessToken: string; username: string }> {
    const user = await this.userRepo.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const accessToken = this.jwtService.sign({
      userId: user.id,
      username: user.username,
    });
    return { accessToken, username: user.username };
  }

  validateToken(token: string): JwtPayload | null {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return { userId: payload.userId, username: payload.username };
    } catch {
      return null;
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { username } });
  }
}
