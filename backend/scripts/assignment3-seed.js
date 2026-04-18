require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');

const TEST_USER = {
  name: 'Assignment 3 QA User',
  email: 'qa.assignment3@example.com',
  password: 'Assignment3!Pass123',
};

const TEST_ORDER = {
  orderNumber: 'FE-390001',
  email: TEST_USER.email,
  shippingAddress: '123 Reliability Avenue, Test City',
};

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be set for Assignment 3 seeding');
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const product = await Product.findOne().sort({ createdAt: 1 }).lean();
  if (!product) {
    throw new Error('Assignment 3 seed requires at least one product in MongoDB');
  }

  const passwordHash = await bcrypt.hash(TEST_USER.password, 10);
  const user = await User.findOneAndUpdate(
    { email: TEST_USER.email },
    {
      $set: {
        name: TEST_USER.name,
        email: TEST_USER.email,
        password: passwordHash,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  let order = await Order.findOne({ orderNumber: TEST_ORDER.orderNumber });
  if (!order) {
    order = new Order({
      orderNumber: TEST_ORDER.orderNumber,
      email: TEST_ORDER.email,
      name: TEST_USER.name,
      shippingAddress: TEST_ORDER.shippingAddress,
      items: [
        {
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          image: product.image,
        },
      ],
      total: product.price,
      estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    });
  } else {
    order.email = TEST_ORDER.email;
    order.name = TEST_USER.name;
    order.shippingAddress = TEST_ORDER.shippingAddress;
    order.items = [
      {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.image,
      },
    ];
    order.total = product.price;
    order.estimatedDelivery = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  }

  order.ensureInitialStatus();
  await order.save();

  const payload = {
    generatedAt: new Date().toISOString(),
    user: {
      id: user._id.toString(),
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
    },
    product: {
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      category: product.category,
    },
    order: {
      orderNumber: order.orderNumber,
      email: order.email,
      total: order.total,
    },
  };

  console.log(JSON.stringify(payload));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });

