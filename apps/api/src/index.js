import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }))
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agent-os-api', version: '1.0.0' })
})

// Placeholder — full routes built in Session 2
app.get('/api/agents', (req, res) => {
  res.json({ agents: [], message: 'Full API built in Session 2' })
})

app.get('/api/workspaces/mine', (req, res) => {
  res.json({
    workspace: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'PostArmy Inc.',
      plan: 'white_label',
    }
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`[agent-os-api] running on port ${PORT}`)
})
