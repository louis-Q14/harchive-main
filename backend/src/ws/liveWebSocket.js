import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { dbUtils } from '../db/database.js';
import logger from '../utils/logger.js';

// In-memory state for active streams
const activeStreams = new Map(); // streamId -> { streamer, viewers, chatClients }

/**
 * Initialize WebSocket server on existing HTTP server
 */
export function initLiveWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws/live' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const streamId = url.searchParams.get('streamId');
    const role = url.searchParams.get('role'); // 'streamer' | 'viewer'

    // Authenticate — read token from query string OR HttpOnly cookie header
    let token = url.searchParams.get('token');
    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/harchive_token=([^;]+)/);
      if (match) token = match[1];
    }
    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      ws.close(4001, 'Unauthorized');
      return;
    }

    ws.userId = user.id;
    ws.userName = user.prenom ? `${user.prenom} ${user.nom || ''}`.trim() : user.email;
    ws.userPhoto = user.photo_url || '';
    ws.streamId = streamId;
    ws.role = role;
    ws.isAlive = true;

    ws.on('pong', () => { ws.isAlive = true; });

    if (role === 'streamer') {
      handleStreamer(ws, streamId);
    } else {
      handleViewer(ws, streamId);
    }

    ws.on('message', (data) => handleMessage(ws, data));
    ws.on('close', () => handleDisconnect(ws));
    ws.on('error', (err) => logger.error('WS error:', err.message));
  });

  // Heartbeat every 30s
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) { ws.terminate(); return; }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  logger.info('🔴 Live WebSocket server initialized on /ws/live');
  return wss;
}

function handleStreamer(ws, streamId) {
  if (!activeStreams.has(streamId)) {
    activeStreams.set(streamId, {
      streamerId: ws.userId,
      streamerWs: ws,
      viewers: new Map(),
      chatClients: new Map(),
      startedAt: Date.now(),
      initSegment: null, // Cache the first chunk (WebM header)
    });
  }
  const stream = activeStreams.get(streamId);
  stream.streamerWs = ws;
  stream.chatClients.set(ws.userId, ws);

  ws.send(JSON.stringify({
    type: 'stream_ready',
    streamId,
    viewerCount: stream.viewers.size,
  }));
}

function handleViewer(ws, streamId) {
  const stream = activeStreams.get(streamId);
  if (!stream) {
    ws.send(JSON.stringify({ type: 'error', message: 'Stream not found or ended' }));
    ws.close(4004, 'Stream not found');
    return;
  }

  stream.viewers.set(ws.userId, ws);
  stream.chatClients.set(ws.userId, ws);

  // Notify streamer of new viewer count
  broadcastViewerCount(streamId);

  ws.send(JSON.stringify({
    type: 'stream_joined',
    streamId,
    viewerCount: stream.viewers.size,
    streamerName: stream.streamerWs?.userName,
  }));

  // Notify chat
  broadcastChat(streamId, {
    type: 'system',
    id: uuidv4(),
    message: `${ws.userName} a rejoint le live`,
    created_date: new Date().toISOString(),
  });

  // Send cached init segment so the viewer can decode the stream
  if (stream.initSegment && ws.readyState === 1) {
    ws.send(stream.initSegment);
  }
}

function handleMessage(ws, rawData) {
  // Binary data = video/audio chunk from streamer
  if (rawData instanceof Buffer || rawData instanceof ArrayBuffer) {
    const stream = activeStreams.get(ws.streamId);
    if (!stream || ws.role !== 'streamer') return;
    // Relay binary media to all viewers
    // Cache the first chunk as init segment (WebM header with codec info)
    if (!stream.initSegment) {
      stream.initSegment = Buffer.from(rawData);
    }
    stream.viewers.forEach((viewer) => {
      if (viewer.readyState === 1) {
        viewer.send(rawData);
      }
    });
    return;
  }

  let msg;
  try {
    msg = JSON.parse(rawData.toString());
  } catch {
    return;
  }

  switch (msg.type) {
    case 'chat':
      handleChatMessage(ws, msg);
      break;
    case 'reaction':
      handleReaction(ws, msg);
      break;
    case 'end_stream':
      handleEndStream(ws);
      break;
    default:
      break;
  }
}

async function handleChatMessage(ws, msg) {
  const chatMsg = {
    type: 'chat',
    id: uuidv4(),
    user_id: ws.userId,
    user_nom: ws.userName,
    user_photo_url: ws.userPhoto,
    message: (msg.message || '').slice(0, 500), // limit message length
    created_date: new Date().toISOString(),
  };

  // Save to DB
  try {
    await dbUtils.run(
      `INSERT INTO live_chat_messages (id, stream_id, user_id, user_nom, user_photo_url, message, type)
       VALUES (?, ?, ?, ?, ?, ?, 'message')`,
      [chatMsg.id, ws.streamId, ws.userId, ws.userName, ws.userPhoto, chatMsg.message]
    );
  } catch (e) {
    logger.error('Failed to save chat message:', e.message);
  }

  broadcastChat(ws.streamId, chatMsg);
}

async function handleReaction(ws, msg) {
  const emoji = (msg.emoji || '❤️').slice(0, 4);
  const reaction = {
    type: 'reaction',
    id: uuidv4(),
    user_id: ws.userId,
    user_nom: ws.userName,
    emoji,
    created_date: new Date().toISOString(),
  };

  // Update live_streams total_likes
  try {
    await dbUtils.run(
      `UPDATE live_streams SET total_likes = total_likes + 1 WHERE id = ?`,
      [ws.streamId]
    );
  } catch (e) {
    logger.error('Failed to update reaction count:', e.message);
  }

  broadcastChat(ws.streamId, reaction);
}

async function handleEndStream(ws) {
  const stream = activeStreams.get(ws.streamId);
  if (!stream || ws.userId !== stream.streamerId) return;

  // Notify all viewers
  stream.chatClients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'stream_ended' }));
    }
  });

  // Update DB
  try {
    await dbUtils.run(
      `UPDATE live_streams SET status = 'ended', ended_at = NOW(),
       peak_viewers = GREATEST(peak_viewers, ?), viewer_count = 0 WHERE id = ?`,
      [stream.viewers.size, ws.streamId]
    );
  } catch (e) {
    logger.error('Failed to update stream status:', e.message);
  }

  // Close all viewer connections
  stream.viewers.forEach((v) => v.close(1000, 'Stream ended'));
  activeStreams.delete(ws.streamId);
}

function handleDisconnect(ws) {
  const stream = activeStreams.get(ws.streamId);
  if (!stream) return;

  if (ws.role === 'streamer') {
    // Streamer disconnected — end stream
    handleEndStream(ws);
  } else {
    stream.viewers.delete(ws.userId);
    stream.chatClients.delete(ws.userId);
    broadcastViewerCount(ws.streamId);
    broadcastChat(ws.streamId, {
      type: 'system',
      id: uuidv4(),
      message: `${ws.userName} a quitté le live`,
      created_date: new Date().toISOString(),
    });
  }
}

function broadcastChat(streamId, chatMsg) {
  const stream = activeStreams.get(streamId);
  if (!stream) return;
  const data = JSON.stringify(chatMsg);
  stream.chatClients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
}

function broadcastViewerCount(streamId) {
  const stream = activeStreams.get(streamId);
  if (!stream) return;
  const count = stream.viewers.size;
  const data = JSON.stringify({ type: 'viewer_count', count });

  // Update peak in memory & DB
  dbUtils.run(
    `UPDATE live_streams SET viewer_count = ?, peak_viewers = GREATEST(peak_viewers, ?) WHERE id = ?`,
    [count, count, streamId]
  ).catch(() => {});

  stream.chatClients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
}

export function getActiveStreams() {
  const result = [];
  activeStreams.forEach((stream, id) => {
    result.push({
      id,
      streamerId: stream.streamerId,
      viewerCount: stream.viewers.size,
      startedAt: stream.startedAt,
    });
  });
  return result;
}
