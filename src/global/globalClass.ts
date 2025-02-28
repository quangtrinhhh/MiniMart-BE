export class ApiResponseDto<T> {
  status: boolean;
  message: string;
  data: T | null;
  error?: string;

  constructor(
    message: string,
    data: T | null = null,
    status: boolean = true,
    error?: string,
  ) {
    this.status = status;
    this.message = message;
    this.data = data;
    this.error = error;
  }
}
