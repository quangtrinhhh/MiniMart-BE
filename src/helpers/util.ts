import * as bcrypt from 'bcrypt';

const saltRounds = 10;

export const hashPasswordHelper = async (
  plainPassword: string,
): Promise<string | null> => {
  try {
    return await bcrypt.hash(plainPassword, saltRounds);
  } catch (error) {
    console.error('Error hashing password:', error);
    return null; // Trả về null nếu có lỗi
  }
};

export const comparePasswordHelper = async (
  plainPassword: string,
  hashPassword: string,
): Promise<boolean> => {
  try {
    return await bcrypt.compare(plainPassword, hashPassword);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false; // Trả về false nếu có lỗi
  }
};
