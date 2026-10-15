import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// Tạo mã định danh duy nhất cho mỗi ghi chú
export const taoId = (): string => {
  return uuidv4();
};