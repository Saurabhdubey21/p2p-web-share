import { useState, useRef } from 'react'
import { io } from 'socket.io-client'
import Peer from 'peerjs'

const socket = io('http://localhost:3001')

function FileShare() {
  const [roomId, setRoomId] = useState('')
  const [joinId, setJoinId] = useState('')
  const [status, setStatus] = useState('idle')
  const [statusMsg, setStatusMsg] = useState('')
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [copied, setCopied] = useState(false)
  const peerRef = useRef(null)
  const connRef = useRef(null)

  const createRoom = () => {
    const id = 'room-' + Math.random().toString(36).substring(2, 8)
    setRoomId(id)
    const peer = new Peer(id)
    peerRef.current = peer

    peer.on('open', () => {
      setStatus('waiting')
      setStatusMsg('Waiting for someone to join...')
      socket.emit('create-room', id)
    })

    peer.on('connection', (conn) => {
      connRef.current = conn
      setStatus('connected')
      setStatusMsg('Connected! Select a file and send it.')
      conn.on('error', (err) => {
        setStatus('error')
        setStatusMsg('Error: ' + err.message)
      })
    })

    peer.on('error', (err) => {
      setStatus('error')
      setStatusMsg('Error: ' + err.message)
    })
  }

  const joinRoom = () => {
    const peer = new Peer()
    peerRef.current = peer

    peer.on('open', () => {
      setStatus('joining')
      setStatusMsg('Connecting to room...')
      const conn = peer.connect(joinId)
      connRef.current = conn

      conn.on('open', () => {
        setStatus('connected')
        setStatusMsg('Connected! Waiting for file...')
      })

      conn.on('data', (data) => {
        setStatus('receiving')
        setStatusMsg('Receiving file...')
        const { fileName, fileData } = data
        const blob = new Blob([fileData])
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName || 'received-file'
        a.click()
        setStatus('done')
        setStatusMsg('✅ File received: ' + fileName)
      })

      conn.on('error', (err) => {
        setStatus('error')
        setStatusMsg('Error: ' + err.message)
      })
    })

    peer.on('error', (err) => {
      setStatus('error')
      setStatusMsg('Error: ' + err.message)
    })
  }

  const sendFile = () => {
    if (!file) { setStatusMsg('Please select a file!'); return }
    if (!connRef.current) { setStatusMsg('Not connected yet!'); return }

    const reader = new FileReader()
    reader.onload = (e) => {
      connRef.current.send({ fileName: file.name, fileData: e.target.result })
      setStatus('done')
      setStatusMsg('✅ File sent: ' + file.name)
      setProgress(100)
    }
    reader.readAsArrayBuffer(file)
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStatusColor = () => {
    if (status === 'connected' || status === 'done') return '#22c55e'
    if (status === 'error') return '#ef4444'
    if (status === 'waiting' || status === 'joining') return '#f59e0b'
    return '#6b7280'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '40px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔗</div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1a1a2e' }}>
            P2P File Share
          </h1>
          <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
            Share files directly, no server storage
          </p>
        </div>

        {/* Send Section */}
        <div style={{
          background: '#f8faff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '16px',
          border: '1px solid #e8eeff'
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            📤 Send a File
          </h2>
          <button
            onClick={createRoom}
            style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Create Room
          </button>

          {roomId && (
            <div style={{
              marginTop: '16px',
              background: '#ede9fe',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '11px', color: '#7c3aed', fontWeight: '600' }}>ROOM ID</p>
                <p style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#5b21b6', letterSpacing: '2px' }}>
                  {roomId}
                </p>
              </div>
              <button
                onClick={copyRoomId}
                style={{
                  background: copied ? '#22c55e' : '#7c3aed',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* Receive Section */}
        <div style={{
          background: '#f8faff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '16px',
          border: '1px solid #e8eeff'
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            📥 Receive a File
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              placeholder="Enter Room ID"
              value={joinId}
              onChange={(e) => setJoinId(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              onClick={joinRoom}
              style={{
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Join
            </button>
          </div>
        </div>

        {/* File Section */}
        <div style={{
          background: '#f8faff',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '16px',
          border: '1px solid #e8eeff'
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            📁 Select & Send File
          </h2>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            style={{ marginBottom: '12px', fontSize: '14px' }}
          />
          {file && (
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#6b7280' }}>
              📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
          <button
            onClick={sendFile}
            style={{
              background: status === 'connected' 
                ? 'linear-gradient(135deg, #22c55e, #16a34a)' 
                : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Send File
          </button>
          {progress > 0 && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ background: '#e5e7eb', borderRadius: '99px', height: '8px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  height: '8px',
                  borderRadius: '99px',
                  width: progress + '%',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        {statusMsg && (
          <div style={{
            background: '#f9fafb',
            borderRadius: '12px',
            padding: '16px',
            border: `2px solid ${getStatusColor()}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: getStatusColor(),
              flexShrink: 0
            }} />
            <p style={{ margin: 0, fontSize: '14px', color: '#374151', fontWeight: '500' }}>
              {statusMsg}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileShare