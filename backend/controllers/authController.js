const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ message: 'Пользователь уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    const accessToken = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      accessToken,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
      message: 'Пользователь создан',
    });

  } catch (err) {
    console.error('Ошибка регистрации:', err);
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

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        interests: user.interests,
      },
    });

  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// exports.logoutUser = async (req, res) => {
//   const token = req.cookies.refreshToken;

//   if (token) {
//     try {
//       const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
//       const user = await User.findById(decoded.id);

//       if (user && user.refreshToken === token) {
//         user.refreshToken = null;
//         await user.save();
//       }
//     } catch (err) {
//       console.error('Ошибка при выходе:', err);
//     }
//   }

//   res.clearCookie('refreshToken');
//   res.json({ message: 'Вы вышли из системы' });
// };