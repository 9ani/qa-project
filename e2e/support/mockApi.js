const sampleProducts = [
  {
    id: '507f1f77bcf86cd799439011',
    _id: '507f1f77bcf86cd799439011',
    name: 'Fusion Laptop Pro',
    description: 'High-performance laptop for engineering workflows.',
    price: 1499,
    category: 'laptops',
    image: '/images/laptop.png',
    brand: 'Fusion',
    stock: 12,
    rating: 4.8,
    numReviews: 28,
    createdAt: '2026-04-09T00:00:00.000Z',
  },
  {
    id: '507f1f77bcf86cd799439012',
    _id: '507f1f77bcf86cd799439012',
    name: 'Fusion ANC Headphones',
    description: 'Wireless active-noise-cancelling headphones.',
    price: 249,
    category: 'audio',
    image: '/images/headphones.png',
    brand: 'Fusion',
    stock: 18,
    rating: 4.6,
    numReviews: 41,
    createdAt: '2026-04-09T00:00:00.000Z',
  },
  {
    id: '507f1f77bcf86cd799439013',
    _id: '507f1f77bcf86cd799439013',
    name: 'Fusion Smart Speaker',
    description: 'Compact smart speaker with room-filling sound.',
    price: 129,
    category: 'audio',
    image: '/images/speaker.png',
    brand: 'Fusion',
    stock: 24,
    rating: 4.4,
    numReviews: 16,
    createdAt: '2026-04-09T00:00:00.000Z',
  },
];

const fulfillJson = (route, status, payload) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });

async function mockCatalogApi(page) {
  await page.route('**/api/products', async route => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }

    return fulfillJson(route, 200, sampleProducts);
  });

  await page.route('**/api/products/*/similar', async route => fulfillJson(route, 200, sampleProducts.slice(1)));

  await page.route('**/api/products/*', async route => {
    if (route.request().method() !== 'GET') {
      return route.continue();
    }

    const url = new URL(route.request().url());
    const productId = url.pathname.split('/').pop();
    const product = sampleProducts.find(item => item.id === productId || item._id === productId);
    if (!product) {
      return fulfillJson(route, 404, { message: 'Product not found' });
    }

    return fulfillJson(route, 200, product);
  });

  await page.route('**/api/search**', async route => {
    const url = new URL(route.request().url());
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();
    const filtered = query
      ? sampleProducts.filter(
          product =>
            product.name.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query)
        )
      : sampleProducts;

    return fulfillJson(route, 200, filtered);
  });
}

async function mockInvalidLogin(page, message = 'Invalid credentials') {
  await page.route('**/api/auth/login', async route =>
    fulfillJson(route, 400, {
      msg: message,
    })
  );
}

async function mockCheckout(page, { delayMs = 400, onRequest } = {}) {
  await page.route('**/api/checkout/create-order', async route => {
    onRequest?.(route.request());
    await new Promise(resolve => setTimeout(resolve, delayMs));

    return fulfillJson(route, 201, {
      message: 'Order created successfully!',
      orderNumber: 'FE-555555',
      estimatedDelivery: '2026-04-12T00:00:00.000Z',
      statusHistory: [
        {
          code: 'ORDER_PLACED',
          label: 'Order placed',
          description: 'Order received.',
          enteredAt: '2026-04-09T00:00:00.000Z',
        },
      ],
      statusFlow: [
        {
          code: 'ORDER_PLACED',
          label: 'Order placed',
          description: 'Order received.',
        },
      ],
      items: [
        {
          productId: sampleProducts[0].id,
          name: sampleProducts[0].name,
          price: sampleProducts[0].price,
          quantity: 1,
          image: sampleProducts[0].image,
        },
      ],
      total: sampleProducts[0].price,
    });
  });
}

module.exports = {
  sampleProducts,
  mockCatalogApi,
  mockInvalidLogin,
  mockCheckout,
};
