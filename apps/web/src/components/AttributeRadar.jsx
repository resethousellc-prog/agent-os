import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

const ATTR_LABELS = {
  reasoning_depth:    'Reasoning',
  execution_speed:    'Speed',
  reliability:        'Reliability',
  creativity:         'Creativity',
  autonomy:           'Autonomy',
  communication:      'Comms',
  collaboration_score:'Collab',
  delegation_quality: 'Delegation',
}

export default function AttributeRadar({ attributes = {}, size = 300 }) {
  const data = Object.entries(ATTR_LABELS).map(([key, label]) => ({
    attribute: label,
    value: attributes[key] ?? 50,
    fullMark: 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data}>
        <PolarGrid stroke="#1E1E2E" />
        <PolarAngleAxis
          dataKey="attribute"
          tick={{ fill: '#94A3B8', fontSize: 11 }}
        />
        <Radar
          name="Attributes"
          dataKey="value"
          stroke="#F59E0B"
          fill="#F59E0B"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{ background: '#12121A', border: '1px solid #1E1E2E', borderRadius: 8 }}
          labelStyle={{ color: '#F8FAFC' }}
          itemStyle={{ color: '#F59E0B' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
