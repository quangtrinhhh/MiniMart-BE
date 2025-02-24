import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { hashPasswordHelper } from 'src/helpers/util';
import { v4 as uuidv4 } from 'uuid';
import { CodeAuthDto, CreateAuthDto } from 'src/auth/dto/create-auth.dto';
import dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private mailerService: MailerService,
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
    const codeID = this.generate6DigitCode();
    const user = this.userRepository.create({
      email,
      password: `${hashedPassword}`,
      last_name,
      first_name,
      phone_number,
      isActive: false,
      code: codeID,
      codeExpired: dayjs().add(15, 'minute').toDate(),
    });

    await this.userRepository.save(user);

    void this.mailerService.sendMail({
      to: user.email,
      subject: 'Acctivate your account at @minimart',
      text: 'Hello World!',
      template: 'register',
      context: {
        name:
          user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.email,
        activationCode: codeID,
      },
    });
    return { _id: user.id };
  }

  async handleActive(data: CodeAuthDto) {
    const user = await this.userRepository.findOne({
      where: { id: Number(data.id), code: data.code },
    });
    if (!user) {
      throw new BadRequestException('Mã code không hợp lệ ');
    }

    const isBeforeCheck = dayjs().isBefore(user.codeExpired);
    if (isBeforeCheck) {
      await this.userRepository.update(
        { id: Number(data.id) },
        { isActive: true },
      );
      console.log(' update isActive', isBeforeCheck);

      return { isBeforeCheck };
    } else {
      throw new BadGatewayException();
    }
  }
}
