function getBarColor(value) {
  if (value >= 75) return 'bg-green-400'
  if (value >= 50) return 'bg-amber-400'
  return 'bg-red-400'
}

function getTextColor(value) {
  if (value >= 75) return 'text-green-400'
  if (value >= 50) return 'text-amber-400'
  return 'text-red-400'
}

export default function AttributeBar({ name, label, value, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-[#94A3B8] capitalize">
          {label || name.replace(/_/g, ' ')}
        </span>
        <span className={`font-bold font-mono text-sm ${getTextColor(value)}`}>
          {value}
        </span>
      </div>
      <div className="relative h-2 bg-[#1E1E2E] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      {onChange && (
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={e => onChange(name, parseInt(e.target.value))}
          className="w-full cursor-pointer mt-1"
        />
      )}
    </div>
  )
}
