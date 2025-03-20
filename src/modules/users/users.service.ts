import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { hashPasswordHelper } from 'src/helpers/util';
import { v4 as uuidv4 } from 'uuid';
import { CodeAuthDto, CreateAuthDto } from 'src/auth/dto/create-auth.dto';
import dayjs from 'dayjs';
import { MailerService } from '@nestjs-modules/mailer';
// import { UpdateUserDto } from './dto/update-user.dto';
import aqp from 'api-query-params';
import { plainToInstance } from 'class-transformer';
import { RoleEnum } from 'src/common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private mailerService: MailerService,
  ) {}
  async onModuleInit() {
    await this.createAdminAccount();
  }
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
  async isPhoneExist(phone: string): Promise<boolean> {
    if (!phone) return false; // Kiểm tra input trước khi truy vấn DB

    const user = await this.userRepository.findOne({
      where: { phone_number: phone },
      select: ['id'], // Chỉ lấy `id`, tránh tải toàn bộ dữ liệu không cần thiết
    });

    return Boolean(user);
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

  async findAll(query: string, current: number, pageSize: number) {
    // Đảm bảo giá trị mặc định cho `current` và `pageSize`
    current = current ?? 1;
    pageSize = pageSize ?? 8;
    // Parse query nhưng bỏ qua `skip` và `limit` của `aqp`
    const { filter, sort } = aqp(query);
    const totalItems = (await this.userRepository.find(filter)).length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const skip = (current - 1) * pageSize;

    delete filter.pageSize;
    delete filter.current;

    const result = await this.userRepository.find({
      where: filter,
      skip: skip,
      take: pageSize,
      order: sort || { created_at: 'DESC' },
    });
    return {
      result: plainToInstance(User, result),
      totalItems: totalItems,
      totalPages: totalPages,
    };
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id: Number(id) },
    });
    return user;
  }

  // async update(id: number, updateUserDto: UpdateUserDto) {
  //   const {
  //     first_name,
  //     last_name,
  //     role,
  //     address,
  //     city,
  //     state,
  //     country,
  //     phone_number,
  //   } = updateUserDto;

  //   const result = await this.userRepository.update(id, {
  //     first_name,
  //     last_name,
  //     role,
  //     address,
  //     city,
  //     state,
  //     country,
  //     phone_number,
  //     updated_at: dayjs(),
  //   });
  //   if (result.affected === 0)
  //     throw new BadRequestException(` User with ID ${id} not found`);
  //   return this.userRepository.findOne({ where: { id } });
  // }

  async remove(id: number) {
    await this.userRepository.delete(id);

    return `This action removes a #${id} user`;
  }
  async findByEmail(email: string) {
    return await this.userRepository.findOne({ where: { email } });
  }

  async handleRegister(registerDTO: CreateAuthDto) {
    const { email, password, last_name, first_name, phone_number } =
      registerDTO;
    const isExist = await this.isEmailExist(email);
    const isPhoneExist = await this.isPhoneExist(phone_number);
    if (isPhoneExist == true)
      throw new BadRequestException(
        `Số điện thoại ${phone_number} đã tồn tại. Vui lòng điền số điện thoại khác`,
      );
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
      subject: 'Account registration information at EGA Mini Mart',
      text: 'EGA Mini Mart',
      template: 'register',
      context: {
        name:
          user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.email,
        activationCode: codeID,
      },
    });
    return { id: user.id };
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

  async retryActive(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) throw new BadRequestException('Tài khoản không tồn tại');

    if (user.isActive)
      throw new BadRequestException('Tài khoản đã được kích hoạt');
    const codeID = this.generate6DigitCode();

    await this.userRepository.update(
      { id: user.id },
      { code: codeID, codeExpired: dayjs().add(15, 'minute').toDate() },
    );

    void this.mailerService.sendMail({
      to: user.email,
      subject: 'Account registration information at EGA Mini Mart',
      text: 'EGA Mini Mart',
      template: 'register',
      context: {
        name:
          user.first_name && user.last_name
            ? `${user.first_name} ${user.last_name}`
            : user.email,
        activationCode: codeID,
      },
    });
    return { id: user.id };
  }

  private async createAdminAccount() {
    const adminEmail = 'admin@gmail.com';
    const existingAdmin = await this.userRepository.findOne({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const hashedPassword = await hashPasswordHelper('123456');
      const adminUser = this.userRepository.create({
        first_name: 'Admin',
        last_name: 'User',
        email: adminEmail,
        password: `${hashedPassword}`,
        role: RoleEnum.ADMIN,
        isActive: true,
        code: '000000',
        codeExpired: new Date(),
        phone_number: undefined,
      });

      await this.userRepository.save(adminUser);
      console.log('Admin account created successfully!');
    } else {
      console.log('Admin account already exists.');
    }
  }
}
