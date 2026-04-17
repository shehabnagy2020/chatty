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
    fileName?: string;
    fileType?: string;
  }): Promise<Message> {
    const msg = new Message();
    msg.roomId = data.roomId;
    msg.content = data.content;
    msg.sender = data.sender;
    msg.recipient = data.recipient || null;
    msg.type = data.type || 'text';
    msg.duration = data.duration || 0;
    msg.callStatus = data.callStatus || null;
    msg.fileName = data.fileName || null;
    msg.fileType = data.fileType || null;
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

  async toggleReaction(
    messageId: number,
    username: string,
    emoji: string,
  ): Promise<{ reactions: Record<string, string[]>; roomId: string } | null> {
    const msg = await this.messageRepo.findOne({ where: { id: messageId } });
    if (!msg) return null;

    let reactions: Record<string, string[]> = {};
    if (msg.reactions) {
      try {
        reactions = JSON.parse(msg.reactions);
      } catch {
        reactions = {};
      }
    }

    const users = reactions[emoji] || [];
    const idx = users.indexOf(username);
    if (idx >= 0) {
      users.splice(idx, 1);
      if (users.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = users;
      }
    } else {
      reactions[emoji] = [...users, username];
    }

    msg.reactions = Object.keys(reactions).length > 0
      ? JSON.stringify(reactions)
      : null;
    await this.messageRepo.save(msg);

    return { reactions, roomId: msg.roomId };
  }
}