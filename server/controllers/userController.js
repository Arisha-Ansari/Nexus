const { User } = require('../models/User');

// @desc    Get a list of users, optionally filtered by role, excluding the logged-in user
// @route   GET /api/users?role=investor
// @access  Private
const getUsers = async (req, res) => {
  try {
    const { role } = req.query;

    const filter = { _id: { $ne: req.user.id } };
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter).select('name email avatarUrl role');

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users.', error: error.message });
  }
};

module.exports = { getUsers };