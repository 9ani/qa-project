const express = require('express');
const mongoose = require('mongoose');
const { describeIndexStats } = require('../pineconeClient');

const router = express.Router();

const DB_READY_STATE = mongoose.Connection.STATES.connected;

const isPineconeConfigured = () =>
  Boolean(process.env.PINECONE_API_KEY && process.env.PINECONE_HOST);

const getDbStatus = () => {
  const state = mongoose.connection.readyState;
  return {
    state,
    label: mongoose.Connection.STATES[state] || 'unknown',
    connected: state === DB_READY_STATE,
  };
};

router.get('/health', (req, res) => {
  const db = getDbStatus();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    db,
  });
});

router.get('/health/ready', (req, res) => {
  const db = getDbStatus();
  const statusCode = db.connected ? 200 : 503;

  res.status(statusCode).json({
    status: db.connected ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    db,
  });
});

router.get('/health/db', (req, res) => {
  const db = getDbStatus();
  const statusCode = db.connected ? 200 : 503;

  res.status(statusCode).json({
    status: db.connected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    db,
  });
});

router.get('/health/pinecone', async (req, res) => {
  if (!isPineconeConfigured()) {
    return res.json({
      status: 'disabled',
      timestamp: new Date().toISOString(),
      configured: false,
      namespace: process.env.PINECONE_NAMESPACE || '',
    });
  }

  try {
    const stats = await describeIndexStats();
    const namespace = process.env.PINECONE_NAMESPACE || '';
    const vectorCount = stats?.namespaces?.[namespace]?.vectorCount || 0;

    return res.json({
      status: 'connected',
      timestamp: new Date().toISOString(),
      configured: true,
      namespace,
      vectorCount,
    });
  } catch (error) {
    return res.status(503).json({
      status: 'unreachable',
      timestamp: new Date().toISOString(),
      configured: true,
      namespace: process.env.PINECONE_NAMESPACE || '',
      error: error.message || 'Unable to reach Pinecone',
    });
  }
});

module.exports = router;
