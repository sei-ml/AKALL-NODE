/**
 * src/routes/nd3Routes.js
 *
 * Express router for ND3 endpoints.
 */

const express = require('express');
const { getAllNd3, getNd3ById } = require('../controllers/nd3Controller');

const router = express.Router();

// GET /api/nd3
router.get('/', getAllNd3);

// GET /api/nd3/:id
router.get('/:id', getNd3ById);

module.exports = router;
