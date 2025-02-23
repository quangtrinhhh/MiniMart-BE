import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (): TypeOrmModuleOptions => {
  const host = process.env.DB_HOST || 'localhost'; // Giá trị mặc định nếu biến môi trường không có
  const port = parseInt(process.env.DB_PORT || '5432', 10); // Cổng mặc định là 5432
  const username = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASS || '123456';
  const database = process.env.DB_NAME || 'minimart_db';

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
