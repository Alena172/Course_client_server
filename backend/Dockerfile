FROM node:18

# Рабочая директория
WORKDIR /usr/src/app

# Установка зависимостей
COPY package*.json ./
RUN npm install

# Копируем исходники
COPY . .

# Установка Chromium для Puppeteer
RUN apt-get update && \
    apt-get install -y wget gnupg ca-certificates && \
    wget -qO - https://dl.google.com/linux/linux_signing_key.pub  | gpg --dearmor > /usr/share/keyrings/googlechrome.gpg && \
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable

# Запуск приложения
CMD ["node", "server.js"]