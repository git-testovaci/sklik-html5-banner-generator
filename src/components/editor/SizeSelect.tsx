import { BANNER_SIZES } from "@/lib/banner-sizes";

interface SizeSelectProps {
  id: string;
  width: number;
  height: number;
  onChange: (width: number, height: number) => void;
}

export function SizeSelect({ id, width, height, onChange }: SizeSelectProps) {
  const currentValue = `${width}x${height}`;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-300">
        Banner size
      </label>
      <select
        id={id}
        value={currentValue}
        onChange={(e) => {
          const [w, h] = e.target.value.split("x").map(Number);
          onChange(w, h);
        }}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
      >
        {BANNER_SIZES.map((size) => (
          <option key={size.label} value={`${size.width}x${size.height}`}>
            {size.label}
          </option>
        ))}
      </select>
    </div>
  );
}
