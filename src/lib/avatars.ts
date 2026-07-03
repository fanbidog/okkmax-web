// 预设头像:存色值(User.image),渲染为带首字母的色块。将来支持上传时 image 存 URL。
export const PRESET_AVATARS = ["#7F77DD", "#1D9E75", "#378ADD", "#E0A020", "#D85A30", "#D4537E", "#0F6E56", "#5F5E5A"];

export function isUrl(image: string | null | undefined): boolean {
  return !!image && /^(https?:\/\/|blob:|data:|\/)/.test(image);
}
