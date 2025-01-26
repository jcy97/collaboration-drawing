export default function IconButton({
  onClick,
  children,
  isActive,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  isActive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      className={`hover:enabled:text-gray-70 foucs:enabled:text-gray-700 flex min-h-[28px] min-w-[28px] items-center justify-center rounded-md text-gray-500 active:enabled:text-gray-900 disabled:cursor-default disabled:opacity-60 ${isActive ? "bg-gray-100 text-blue-600 hover:enabled:text-blue-600 focus:enabled:text-blue-600 active:enabled:text-teal-600" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
