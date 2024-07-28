const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const port = 4000;
const app = express();

app.use(express.json());
app.use(cors());

const localhost = "http://localhost:";

// Database connection with MongoDB
mongoose.connect("mongodb+srv://admin:qwerty123@cluster0.60s2o7c.mongodb.net/e-commerce");

// API creation
app.get("/", (req, res) => {
  res.send("Express App is Running");
});

// Image storage engine
const storage = multer.diskStorage({
  destination: './upload/images',
  filename: (req, file, cb) => {
    return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });

// Upload endpoint
app.use('/images', express.static('upload/images'));
app.post("/upload", upload.single('product'), (req, res) => {
  res.json({
    success: 1,
    image_url: `${localhost}${port}/images/${req.file.filename}`
  });
});

// Schema for creating products
const productSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

const Product = mongoose.model("Product", productSchema);

app.post('/addproduct', async (req, res) => {
  try {
    let products = await Product.find({});
    let id = products.length > 0 ? products[products.length - 1].id + 1 : 1;

    const product = new Product({
      id: id,
      name: req.body.name,
      image: req.body.image,
      category: req.body.category,
      new_price: req.body.new_price,
      old_price: req.body.old_price
    });

    await product.save();
    res.json({ success: true, name: req.body.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// Creating API for deleting products
app.post('/removeproduct', async (req, res) => {
  try {
    await Product.findOneAndDelete({ id: req.body.id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// Create API for displaying all products
app.get('/allproducts', async (req, res) => {
  try {
    let products = await Product.find({});
    res.send(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// Users schema for model
const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
    default: {},
  },
  date: {
    type: Date,
    default: Date.now,
  }
});

const User = mongoose.model('User', userSchema);

// Creating endpoint for registering the user
app.post('/signup', async (req, res) => {
  try {
    let check = await User.findOne({ email: req.body.email });
    if (check) {
      return res.status(400).json({ success: false, errors: "Existing user found with the same email address" });
    }

    let cart = {};
    for (let i = 0; i < 300; i++) {
      cart[i] = 0;
    }

    const user = new User({
      name: req.body.username,
      email: req.body.email,
      password: req.body.password,
      cartData: cart,
    });

    await user.save();

    const data = { user: { id: user.id } };
    const token = jwt.sign(data, 'secret_ecom');
    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// User login
app.post('/login', async (req, res) => {
  try {
    let user = await User.findOne({ email: req.body.email });
    if (user && req.body.password === user.password) {
      const data = { user: { id: user.id } };
      const token = jwt.sign(data, 'secret_ecom');
      res.json({ success: true, token });
    } else {
      res.status(400).json({ success: false, errors: "Invalid email or password" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

app.get('/newcollections', async (req, res) => {
  try {
    let products = await Product.find({});
    let newCollection = products.slice(-8);
    res.send(newCollection);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// creating endpoint for popular
app.get('/popularinwomen', async (req, res) => {
  try {
    let products = await Product.find({ category: "women" });
    let popularInWomen = products.slice(0, 4);
    res.send(popularInWomen);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
});

// creating middleware to fetch user
const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    return res.status(401).send({ errors: "Please authenticate using a valid token" });
  }
  try {
    const data = jwt.verify(token, 'secret_ecom');
    req.user = data.user;
    next();
  } catch (err) {
    res.status(401).send({ errors: "Please authenticate using a valid token" });
  }
};

// creating endpoint for adding to cart
app.post('/addtocart', fetchUser, async (req, res) => {
    try {
        const { itemId } = req.body;
        let userData = await User.findOne({ _id: req.user.id });

        // Update or initialize item count in cartData
        userData.cartData[itemId] = (userData.cartData[itemId] || 0) + 1;

        // Save updated cartData
        await User.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});


// creating endpoint to remove from cart
app.post('/removefromcart', fetchUser, async (req, res) => {
    try {
        const { itemId } = req.body;
        let userData = await User.findOne({ _id: req.user.id });

        // Ensure item exists and decrement count if greater than zero
        if (userData.cartData[itemId] > 0) {
            userData.cartData[itemId] -= 1;
        }

        // Save updated cartData
        await User.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});


// endpoint to get cart data
app.post('/getcart', fetchUser, async (req, res) => {
    try {
        const userData = await User.findOne({ _id: req.user.id });
        res.json(userData.cartData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Server Error" });
    }
});



app.listen(port, (error) => {
  if (!error) {
    console.log("Server running on Port " + port);
  } else {
    console.log("Error: " + error);
  }
});
