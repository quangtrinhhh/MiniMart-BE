import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { hashPasswordHelper } from 'src/helpers/util';
import { v4 as uuidv4 } from 'uuid';
import { CreateAuthDto } from 'src/auth/dto/create-auth.dto';
import dayjs from 'dayjs';

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

  async isEmailExist(email: string): Promise<boolean> {
    const userEmail = await this.userRepository.findOne({
      where: { email },
    });
    return !!userEmail;
  }

  async create(createUserDto: CreateUserDto) {
    const { email, password, last_name, first_name, phone_number } =
      createUserDto;
    const isExist = await this.isEmailExist(email);
    if (isExist == true) {
      throw new BadRequestException(
        `Email đã tồn tại : ${email}. Vui lòng điền email khác`,
      );
    }
    const hashedPassword = await hashPasswordHelper(password);

    const user = this.userRepository.create({
      email,
      password: `${hashedPassword}`,
      last_name,
      first_name,
      phone_number,
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
    return updateUserDto;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
  async findByEmail(email: string) {
    return await this.userRepository.findOne({ where: { email } });
  }

  async handleRegister(registerDTO: CreateAuthDto) {
    const { email, password, last_name, first_name, phone_number } =
      registerDTO;
    const isExist = await this.isEmailExist(email);
    if (isExist == true) {
      throw new BadRequestException(
        `Email đã tồn tại : ${email}. Vui lòng điền email khác`,
      );
    }
    const hashedPassword = await hashPasswordHelper(password);
    const user = this.userRepository.create({
      email,
      password: `${hashedPassword}`,
      last_name,
      first_name,
      phone_number,
      isActive: false,
      code: this.generate6DigitCode(),
      codeExpired: dayjs().add(15, 'minute'),
    });

    await this.userRepository.save(user);
    return { _id: user.id };
  }
}
