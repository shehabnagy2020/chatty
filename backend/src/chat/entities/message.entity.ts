import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity()
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  roomId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 255 })
  sender: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  recipient: string | null;

  @Column({ type: 'varchar', length: 20, default: 'text' })
  type: string;

  @Column({ type: 'integer', default: 0 })
  duration: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  callStatus: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
