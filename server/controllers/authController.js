const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Entrepreneur, Investor } = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// REGISTER
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, ...extraFields } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let newUser;
    if (role === 'entrepreneur') {
      newUser = await Entrepreneur.create({
        name, email, password: hashedPassword, role, ...extraFields
      });
    } else if (role === 'investor') {
      newUser = await Investor.create({
        name, email, password: hashedPassword, role, ...extraFields
      });
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const token = generateToken(newUser._id);

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatarUrl: newUser.avatarUrl,
        bio: newUser.bio
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email, role });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        bio: user.bio
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};