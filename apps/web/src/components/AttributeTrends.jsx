import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

const ATTR_COLORS = {
  reasoning_depth:    '#A78BFA',
  execution_speed:    '#22D3EE',
  reliability:        '#22C55E',
  creativity:         '#EC4899',
  autonomy:           '#F59E0B',
  communication:      '#3B82F6',
  collaboration_score:'#F97316',
  delegation_quality: '#84CC16',
}

export default function AttributeTrends({ history = [] }) {
  if (history.length < 2) {
    return (
      <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-8 text-center text-[#94A3B8]">
        <div className="text-sm">Need at least 2 attribute snapshots to show trends</div>
        <div className="text-xs mt-1 opacity-60">Attributes recalculate every Sunday</div>
      </div>
    )
  }

  const data = [...history].reverse().map(snapshot => ({
    date: new Date(snapshot.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    ...Object.fromEntries(
      Object.keys(ATTR_COLORS).map(attr => [attr, snapshot[attr] ?? null])
    ),
  }))

  return (
    <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl p-5">
      <div className="text-sm text-[#94A3B8] mb-4 uppercase tracking-wider">Attribute Trends (90 days)</div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 8 }}
            labelStyle={{ color: '#F8FAFC' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#94A3B8' }} />
          <ReferenceLine y={90} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Promotion', fill: '#F59E0B', fontSize: 10 }} />
          {Object.entries(ATTR_COLORS).map(([attr, color]) => (
            <Line
              key={attr}
              type="monotone"
              dataKey={attr}
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              name={attr.replace(/_/g, ' ')}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
