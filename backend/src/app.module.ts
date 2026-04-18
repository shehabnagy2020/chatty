import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { Message } from './chat/entities/message.entity';
import { Room } from './chat/entities/room.entity';
import { User } from './auth/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH || 'chatty.db',
      entities: [Message, Room, User],
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), '..', 'frontend', 'dist'),
      exclude: ['/socket.io/(.*)', '/auth/(.*)', '/assets/(.*)'],
    }),
    ChatModule,
    AuthModule,
  ],
})
export class AppModule {}
