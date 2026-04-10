const express = require('express');
const router = express.Router();
const Product = require('../models/product');

const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeSearchQuery = query => {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  return trimmed ? escapeRegex(trimmed) : '';
};

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Search for products
 *     description: Retrieve a list of products that match the provided search query in their name or description. If no query is provided, it returns all products.
 *     tags:
 *       - Search
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: false
 *         description: The search query to match against product names or descriptions.
 *     responses:
 *       200:
 *         description: A list of products matching the search query.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     description: The unique identifier for the product.
 *                   name:
 *                     type: string
 *                     description: The name of the product.
 *                   description:
 *                     type: string
 *                     description: The description of the product.
 *                   price:
 *                     type: number
 *                     format: float
 *                     description: The price of the product.
 *                   category:
 *                     type: string
 *                     description: The category of the product.
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: The date the product was created.
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                     description: The date the product was last updated.
 *       500:
 *         description: An internal server error occurred.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   description: A message describing the error.
 */
router.get('/', async (req, res) => {
  try {
    const normalizedQuery = normalizeSearchQuery(req.query.q);
    const filter = normalizedQuery
      ? {
          $or: [{ name: { $regex: normalizedQuery, $options: 'i' } }, { description: { $regex: normalizedQuery, $options: 'i' } }],
        }
      : {};

    const products = await Product.find(filter);

    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ error: 'An error occurred during the search.' });
  }
});

router.escapeRegex = escapeRegex;
router.normalizeSearchQuery = normalizeSearchQuery;

module.exports = router;
