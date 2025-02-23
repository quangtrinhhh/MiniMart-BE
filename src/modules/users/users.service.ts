import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { hashPasswordHelper } from 'src/helpers/util';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  generate6DigitCode() {
    const uuid = uuidv4(); // Tạo UUID
    const shortCode =
      parseInt(uuid.replace(/-/g, '').slice(0, 6), 16) % 1000000; // Chuyển thành số 6 chữ số
    return shortCode.toString().padStart(6, '0'); // Đảm bảo đủ 6 chữ số
  }
  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await hashPasswordHelper(createUserDto.password);

    const user = this.userRepository.create({
      first_name: `${createUserDto.first_name}`,
      last_name: createUserDto.last_name,
      email: createUserDto.email,
      password: `${hashedPassword}`,
      phone_number: createUserDto.phone_number,
      code: this.generate6DigitCode(),
      isActive: false,
    });
    const repon = await this.userRepository.save(user);
    return repon;
  }

  async findAll() {
    return this.userRepository.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
  async findByEmail(email: string) {
    return await this.userRepository.findOne({ where: { email } });
  }
}
