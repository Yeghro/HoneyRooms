import 'dotenv/config'
import express from 'express'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize express app
const app = express()

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// Add rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})

app.use('/api/', apiLimiter)

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')))

// Serve node_modules directory
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')))

app.use(express.json({ limit: '50mb' }))

// Add this helper function at the top of your file
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
}

// API endpoints for room operations
app.get('/api/rooms', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('room_info')
      .select('*')
    
    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Ensure data is an array
    const rooms = Array.isArray(data) ? data : []
    console.log('Fetched rooms:', rooms) // Debug log
    
    res.json(rooms)
  } catch (error) {
    console.error('Server error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/rooms', async (req, res) => {
  try {
    console.log('Received request body:', req.body)
    
    // Validate required fields
    const requiredFields = ['room_name', 'room_npub', 'room_nsec', 'room_owner']
    for (const field of requiredFields) {
      if (!req.body[field]) {
        console.log(`Missing required field: ${field}, value:`, req.body[field])
        return res.status(400).json({ error: `Missing required field: ${field}` })
      }
    }

    // Validate UUID format
    if (!isValidUUID(req.body.room_owner)) {
      return res.status(400).json({ 
        error: 'Invalid room_owner format', 
        details: 'room_owner must be a valid UUID'
      })
    }

    const roomData = {
      room_name: req.body.room_name,
      room_npub: req.body.room_npub,
      room_nsec: req.body.room_nsec,
      room_owner: req.body.room_owner,  // This should now be a valid UUID
      room_description: req.body.room_description || null,
      room_picture_url: req.body.room_picture_url || null,
      room_nip05: req.body.room_nip05 || null,
      room_lightning_address: req.body.room_lightning_address || null,
      room_zap_goal: req.body.room_zap_goal || 0,
      room_visibility: req.body.room_visibility ?? true,
      room_nostr_acl_list: req.body.room_nostr_acl_list || [],
      room_email_acl_list: req.body.room_email_acl_list || [],
      save_chat_directive: req.body.save_chat_directive ?? false,
      room_relay_url: req.body.room_relay_url || null
    }

    console.log('Processed room data before insert:', roomData)

    const { data, error } = await supabase
      .from('room_info')
      .insert([roomData])
      .select()
    
    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ 
        error: 'Database error', 
        details: error.message,
        code: error.code,
        roomData: roomData
      })
    }

    console.log('Room created successfully:', data)
    res.json(data)
  } catch (error) {
    console.error('Server error:', error)
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack
    })
  }
})

app.put('/api/rooms/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('room_info')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
    
    if (error) throw error
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('room_info')
      .delete()
      .eq('id', req.params.id)
    
    if (error) throw error
    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Add this test endpoint
app.get('/api/test', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('room_info')
      .select('count')
      .single()
    
    if (error) throw error
    res.json({ message: 'Supabase connection successful', count: data.count })
  } catch (error) {
    console.error('Supabase connection test failed:', error)
    res.status(500).json({ error: 'Failed to connect to Supabase' })
  }
})

// Add these new endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/health', async (req, res) => {
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('room_info')
      .select('count')
      .limit(1)
    
    res.json({
      status: 'ok',
      database: error ? 'error' : 'connected',
      timestamp: new Date().toISOString(),
      error: error?.message
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      error: error.message
    })
  }
})

// Add this endpoint to fetch a single room by ID
app.get('/api/rooms/:id', async (req, res) => {
    try {
        const { id } = req.params

        const { data: room, error } = await supabase
            .from('room_info')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('Supabase error:', error)
            throw error
        }
        
        if (!room) {
            return res.status(404).json({ 
                error: 'Room not found',
                details: `No room found with ID: ${id}`
            })
        }

        console.log('Fetched room:', room) // Debug log
        res.json(room)
    } catch (error) {
        console.error('Error fetching room:', error)
        res.status(500).json({ 
            error: 'Failed to fetch room',
            details: error.message
        })
    }
})

// Modify the endpoint to use the correct table name and path
app.get('/api/profiles/:profileId/pubkey', async (req, res) => {
    try {
        const { profileId } = req.params

        // Get the user's pubkey from the profiles table
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('nostr_pubkey')
            .eq('id', profileId)
            .single()

        if (profileError) throw profileError
        if (!profileData) {
            return res.status(404).json({ error: 'Profile not found' })
        }

        // Return just the pubkey
        res.json({
            pubkey: profileData.nostr_pubkey
        })
    } catch (error) {
        console.error('Error fetching profile pubkey:', error)
        res.status(500).json({ 
            error: 'Failed to fetch profile pubkey',
            details: error.message
        })
    }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})