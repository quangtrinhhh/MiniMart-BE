import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1', { exclude: [``] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Tự động loại bỏ field thừa
      forbidNonWhitelisted: true, // Ngăn không cho field lạ lọt vào
      transform: true, // Biến string -> number, v.v.
      transformOptions: {
        enableImplicitConversion: true, // Cho phép auto transform dựa vào kiểu khai báo
      },
    }),
  );
  app.enableCors({
    origin: [
      `${process.env.DOMAIN_FE}`,
      'http://localhost:3000', // Thêm các domain khác nếu cần
      `${process.env.DOMAIN_PRODUCTION}`, // Thêm nhiều domain khác nữa
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
