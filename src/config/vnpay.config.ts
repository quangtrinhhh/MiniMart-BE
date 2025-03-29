export const vnpayConfig = {
  vnp_TmnCode: process.env.VNP_TMN_CODE || 'UB0WM9FX',
  vnp_HashSecret:
    process.env.VNP_HASH_SECRET || 'X3QRQR59E9LR8YGQPP51DENMSDTV5G4P',
  vnp_Url:
    process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnp_ReturnUrl:
    process.env.VNP_RETURN_URL || 'http://localhost:3000/vnpay-return',
  vnp_ApiUrl:
    process.env.VNP_API_URL ||
    'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
};
