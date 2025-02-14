/**
 * src/controllers/nd3Controller.js
 *
 * Controller for handling nd3-related REST endpoints.
 */

const Nd3 = require('../models/nd3Model');

/**
 * GET /api/nd3
 * List all ND3 records
 */
async function getAllNd3(req, res) {
  try {
    const files = await Nd3.find({});
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/nd3/:id
 * Get a single ND3 record by ID
 */
async function getNd3ById(req, res) {
  try {
    const { id } = req.params;
    const file = await Nd3.findById(id);
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(file);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  getAllNd3,
  getNd3ById,
};
