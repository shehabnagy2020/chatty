import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { Room } from './entities/room.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
    @InjectRepository(Room)
    private roomRepo: Repository<Room>,
  ) {}

  async saveMessage(data: {
    roomId: string;
    content: string;
    sender: string;
    recipient?: string;
    type?: string;
    duration?: number;
    callStatus?: string;
  }): Promise<Message> {
    const msg = new Message();
    msg.roomId = data.roomId;
    msg.content = data.content;
    msg.sender = data.sender;
    msg.recipient = data.recipient || null;
    msg.type = data.type || 'text';
    msg.duration = data.duration || 0;
    msg.callStatus = data.callStatus || null;
    return this.messageRepo.save(msg);
  }

  async getMessages(
    roomId: string,
    limit = 100,
    before?: number,
  ): Promise<Message[]> {
    const qb = this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.roomId = :roomId', { roomId })
      .orderBy('msg.id', 'DESC')
      .limit(limit);

    if (before) {
      qb.andWhere('msg.id < :before', { before });
    }

    const messages = await qb.getMany();
    return messages.reverse();
  }

  async getDmList(username: string): Promise<string[]> {
    const messages = await this.messageRepo
      .createQueryBuilder('msg')
      .where('msg.roomId LIKE :prefix', { prefix: 'dm:%' })
      .andWhere('msg.sender = :username OR msg.recipient = :username', {
        username,
      })
      .orderBy('msg.id', 'DESC')
      .getMany();

    const partners = new Set<string>();
    for (const msg of messages) {
      const roomId = msg.roomId;
      const match = roomId.match(/^dm:(.+)-(.+)$/);
      if (match) {
        const [, a, b] = match;
        const partner = a === username ? b : a;
        partners.add(partner);
      }
    }
    return Array.from(partners);
  }

  async ensureRoom(roomId: string, name?: string): Promise<Room> {
    let room = await this.roomRepo.findOne({ where: { roomId } });
    if (!room) {
      room = new Room();
      room.roomId = roomId;
      room.name = name || roomId;
      await this.roomRepo.save(room);
    }
    return room;
  }

  async getRooms(): Promise<Room[]> {
    return this.roomRepo.find();
  }

  async deleteRoom(roomId: string): Promise<void> {
    await this.roomRepo.delete({ roomId });
  }
}
