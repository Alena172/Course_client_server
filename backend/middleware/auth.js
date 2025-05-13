const jwt = require('jsonwebtoken');
const User = require('../models/User'); 

module.exports = async function(req, res, next) {
    try {
      console.log('--- Auth Middleware Debug ---');
      console.log('Headers:', req.headers);
      
      const token = req.header('Authorization')?.replace('Bearer ', '');
      console.log('Extracted Token:', token || 'NOT FOUND');
      
      if (!token) {
        console.log('No token provided');
        return res.status(401).json({ message: 'Требуется авторизация' });
      }
  
      console.log('JWT Secret:', process.env.JWT_SECRET ? 'EXISTS' : 'MISSING');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Decoded Token:', decoded);
  
      const user = await User.findById(decoded.id);
      console.log('Found User:', user ? user._id : 'NOT FOUND');
  
      if (!user) {
        console.log('User not found in database');
        return res.status(401).json({ message: 'Пользователь не найден' });
      }
  
      req.user = user;
      console.log('Authentication SUCCESS for user:', user._id);
      next();
    } catch (err) {
      console.error('Auth Error:', err.message);
      console.error('Stack:', err.stack);
      res.status(401).json({ 
        message: 'Ошибка авторизации',
        error: err.message 
      });
    }
  };