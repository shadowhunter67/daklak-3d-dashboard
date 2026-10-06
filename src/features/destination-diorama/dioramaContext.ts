import { createContext, useContext } from 'react';

/**
 * Bối cảnh dùng chung bên trong `<Canvas>`: R3F tạo một root React riêng nên context từ ngoài
 * Canvas không đi vào được — `DioramaCanvas` cung cấp hai giá trị này ngay bên trong.
 */
export const ShadowsContext = createContext(false);
export const MotionContext = createContext(false);

/** Máy đủ mạnh để bật bóng đổ (cờ `contactShadows` của graphicsQuality). */
export function useShadows(): boolean {
  return useContext(ShadowsContext);
}

/** Người dùng yêu cầu giảm chuyển động: không cuộn nước, không bốc sương, camera nhảy thẳng. */
export function useReducedMotionScene(): boolean {
  return useContext(MotionContext);
}
