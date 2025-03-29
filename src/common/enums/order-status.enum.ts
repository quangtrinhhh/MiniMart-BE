export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
  CONFIRMED = 'confirmed',
}
export enum PaymentMethod {
  COD = 'cod', // Thanh toán khi nhận hàng
  BANK_TRANSFER = 'bank_transfer', // Chuyển khoản ngân hàng
}
export enum PaymentStatus {
  PENDING = 'pending', // Đang chờ thanh toán
  PAID = 'paid', // Đã thanh toán
  FAILED = 'failed', // Thanh toán thất bại
  EXPIRED = 'expired', // Quá hạn chưa thanh toán
}
