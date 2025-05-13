const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); 

exports.registerUser = async (req, res) => {
    const { username, email, password } = req.body;
  
    try {
      const existing = await User.findOne({ $or: [{ username }, { email }] });
      if (existing) return res.status(400).json({ message: 'Пользователь уже существует' });
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
      });
  
      await newUser.save();
  
      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  
      res.status(201).json({
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          interests: newUser.interests,
        },
        message: 'Пользователь создан',
      });
    } catch (err) {
      res.status(500).json({ message: 'Ошибка сервера' });
    }
  };
  

  exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: 'Пользователь не найден' });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Неверный пароль' });
      }
  
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT секрет не настроен');
      }
  
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
      
      res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          interests: user.interests,
        },
      });
    } catch (err) {
      console.error('Детали ошибки входа:', err); // Подробное логирование
      res.status(500).json({ 
        message: 'Ошибка сервера',
        error: err.message // Отправляем реальное сообщение об ошибке (для разработки)
      });
    }
};
  