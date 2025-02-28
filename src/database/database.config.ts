import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => {
  const host = process.env.DB_HOST;
  const port = parseInt(process.env.DB_PORT || '5432', 10);
  const username = process.env.DB_USER;
  const password = process.env.DB_PASS;
  const database = process.env.DB_NAME;

  return {
    type: 'postgres',
    host, // Cấu hình host
    port, // Cấu hình cổng
    username, // Tên người dùng
    password, // Mật khẩu
    database, // Tên cơ sở dữ liệu
    synchronize: true, // Tự động đồng bộ hóa với database (không nên bật ở môi trường production)
    logging: true, // Log các câu lệnh SQL
    autoLoadEntities: true, // Tự động tải các entity
    migrationsRun: true, // Chạy các migrations tự động
    entities: [
      // Đường dẫn tới các entity trong dự án
      __dirname + '/**/*.entity{.ts,.js}',
    ],
    subscribers: [], // Đăng ký các subscribers (nếu có)
    migrations: [
      // Đường dẫn tới các migration (nếu có)
      __dirname + '/migrations/*{.ts,.js}',
    ],
  };
};
