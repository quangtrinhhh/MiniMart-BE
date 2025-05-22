import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Coupon } from './entities/coupon.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) {}
  async create(dto: CreateCouponDto) {
    const exists = await this.couponRepository.findOne({
      where: { coupon_code: dto.coupon_code },
    });

    if (exists) {
      throw new BadRequestException('Coupon code already exists');
    }

    const newCoupon = this.couponRepository.create({
      ...dto,
      coupon_code: dto.coupon_code.toUpperCase(),
    });
    return await this.couponRepository.save(newCoupon);
  }
  async findAll(current: number, pageSize: number) {
    const skip = (current - 1) * pageSize;

    // Đếm tổng số phần tử
    const total = await this.couponRepository.count();

    // Lấy dữ liệu phân trang
    const data = await this.couponRepository.find({
      skip,
      take: pageSize,
      order: { created_at: 'DESC' },
    });

    return {
      data,
      meta: {
        total,
        currentPage: current,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: number) {
    const coupon = await this.couponRepository.findOne({
      where: { id },
    });
    if (!coupon) {
      throw new BadRequestException(`Coupon with id ${id} not found`);
    }
    return coupon;
  }

  async update(id: number, updateCouponDto: UpdateCouponDto) {
    const coupon = await this.couponRepository.findOne({
      where: { id },
    });

    if (!coupon) {
      throw new BadRequestException(`Coupon with id ${id} not found`);
    }
    await this.couponRepository.update(id, updateCouponDto);
    return `This action updates a #${updateCouponDto.coupon_code} coupon`;
  }

  async remove(id: number) {
    const coupon = await this.couponRepository.findOne({
      where: { id },
    });
    if (!coupon) {
      throw new BadRequestException(`Coupon with id ${id} not found`);
    }
    // Nếu muốn xóa mềm (soft delete)
    await this.couponRepository.softDelete(id);

    // Nếu muốn xóa cứng (hard delete)
    // await this.couponRepository.delete({ id });

    return `Coupon with id ${id} has been successfully removed.`;
  }
}
