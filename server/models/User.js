const mongoose = require('mongoose');

const baseOptions = {
  discriminatorKey: 'role',
  collection: 'users',
  timestamps: true
};

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  bio: { type: String, default: '' },
  isOnline: { type: Boolean, default: false }
}, baseOptions);

const User = mongoose.model('User', userSchema);

const Entrepreneur = User.discriminator('entrepreneur', new mongoose.Schema({
  startupName: { type: String, default: '' },
  pitchSummary: { type: String, default: '' },
  fundingNeeded: { type: String, default: '' },
  industry: { type: String, default: '' },
  location: { type: String, default: '' },
  foundedYear: { type: Number },
  teamSize: { type: Number }
}));

const Investor = User.discriminator('investor', new mongoose.Schema({
  investmentInterests: { type: [String], default: [] },
  investmentStage: { type: [String], default: [] },
  portfolioCompanies: { type: [String], default: [] },
  totalInvestments: { type: Number, default: 0 },
  minimumInvestment: { type: String, default: '' },
  maximumInvestment: { type: String, default: '' }
}));

module.exports = { User, Entrepreneur, Investor }; 