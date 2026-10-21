/**
 * 自绘线性图标：viewBox 24、stroke 1.8、吃 currentColor（跟主题）。
 * 引导画面的菜单行与 ☰ 主菜单共用它，口径同顶栏图标（见 feedback 里的视觉验收标准）。
 */

export function LineIcon({
  d,
  size = 20,
  strokeWidth = 1.8,
}: {
  d: string;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
