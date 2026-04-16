import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
      database: 'chatty.db',
      entities: [Message, Room, User],
      synchronize: true,
    }),
    ChatModule,
    AuthModule,
  ],
})
export class AppModule {}
