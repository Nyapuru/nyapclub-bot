const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

// -------------------
// Настройки окружения
// -------------------
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const PORT = process.env.PORT || 10000;

// -------------------
// Инициализация бота
// -------------------
const bot = new Telegraf(BOT_TOKEN);

// -------------------
// Firebase Admin SDK
// -------------------
admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.TYPE,
    project_id: process.env.PROJECT_ID,
    private_key_id: process.env.PRIVATE_KEY_ID,
    private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.CLIENT_EMAIL,
    client_id: process.env.CLIENT_ID,
    auth_uri: process.env.AUTH_URI,
    token_uri: process.env.TOKEN_URI,
    auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
    client_x509_cert_url: process.env.client_x509_cert_url
  })
});

const db = admin.firestore();

// -------------------
// Express сервер
// -------------------
const app = express();
app.use(cors());
app.use(express.json());

// Проверка сервера
app.get('/', (req, res) => {
  res.send('🐧 Nyapuru Club bot & API running!');
});

// Endpoint для кликов с фронтенда
app.post('/click', async (req, res) => {
  try {
    const { userId, userName, photoUrl } = req.body;
    console.log("📩 Получен клик:", req.body);

    if (!userId) {
      console.warn("⚠️ Нет userId в теле запроса");
      return res.status(400).json({ error: "Нет userId" });
    }

    const userRef = db.collection('users').doc(String(userId));

    // Обновляем или создаем пользователя
    await userRef.set({
      name: userName || "Без имени",
      photo_url: photoUrl ?? null,
      lastClick: new Date()
    }, { merge: true });

    // Инкремент кликов
    await userRef.update({
      clicks: admin.firestore.FieldValue.increment(1)
    });

    console.log(`✅ Клик засчитан для пользователя ${userId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Ошибка при обработке клика:", err);
    res.status(500).json({ error: err.message });
  }
});

// Запуск Express
app.listen(PORT, () => {
  console.log(`🚀 Express listening on port ${PORT}`);
});

// -------------------
// Telegram-бот
// -------------------
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const userRef = db.collection('users').doc(String(userId));

  await userRef.set({
    id: userId,
    name: ctx.from.first_name || 'друг',
    photo_url: ctx.from.photo_url || null,
    subscribed: true
  }, { merge: true });

  await ctx.replyWithPhoto(
    'https://i.ibb.co/9mRgh8VL/penguin.png',
    {
      caption: `Привет, ${ctx.from.first_name || 'друг'}! 🐧\nТы классный! Я помогу тебе освоиться и не пропустить стримы с Няпом и Маней :3`,
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🐧 Разбудить Пингвина', 'https://nyapuru.github.io/testsite/')],
        [Markup.button.url('🌸 Уютный канал', 'https://t.me/nyaplive')],
        [Markup.button.url('💬 Ламповый чатик', 'https://t.me/nyapchat')]
      ])
    }
  );
});

// -------------------
// Рассылка уведомлений
// -------------------
async function sendStreamNotification(message, photoUrl, streamUrl, ctx) {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('У тебя нет прав для этой команды!');
  try {
    const usersSnapshot = await db.collection('users').where('subscribed', '==', true).get();
    let count = 0;

    for (const doc of usersSnapshot.docs) {
      const userId = parseInt(doc.id);
      try {
        await ctx.telegram.sendPhoto(
          userId,
          photoUrl,
          {
            caption: message,
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([[Markup.button.url('📺 Смотреть', streamUrl)]])
          }
        );
        count++;
        await new Promise(res => setTimeout(res, 50));
      } catch (e) {
        console.log('Ошибка отправки пользователю', userId, e.message);
      }
    }

    ctx.reply(`Уведомление отправлено ${count} пользователям`);
  } catch (err) {
    console.error('Ошибка при рассылке:', err.message);
    ctx.reply('Произошла ошибка при рассылке. Смотри логи.');
  }
}

// Команды для уведомлений
bot.command('stream1', async (ctx) => {
  await sendStreamNotification(
    "🎥 Няп запустил стрим и ждёт тебя!",
    'https://i.ibb.co/WNwR2Jfp/41414144444422.jpg',
    'https://twitch.tv/nyapuru',
    ctx
  );
});

bot.command('stream2', async (ctx) => {
  await sendStreamNotification(
    "🎥 Маня запустила стрим и ждёт тебя!",
    'https://i.ibb.co/3ycZ6CZj/555555555555555555.jpg',
    'https://www.twitch.tv/manyaunderscore',
    ctx
  );
});

bot.command('schedule', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('У тебя нет прав для этой команды!');
  const message = "📃 Расписание стримов на эту неделю!";
  const photoUrl = 'https://i.ibb.co/GvYV126f/rasss.jpg';

  try {
    const usersSnapshot = await db.collection('users').where('subscribed', '==', true).get();
    let count = 0;

    for (const doc of usersSnapshot.docs) {
      const userId = parseInt(doc.id);
      try {
        await ctx.telegram.sendPhoto(userId, photoUrl, { caption: message });
        count++;
        await new Promise(res => setTimeout(res, 50));
      } catch (e) {
        console.log('Ошибка отправки пользователю', userId, e.message);
      }
    }

    ctx.reply(`Расписание отправлено ${count} пользователям`);
  } catch (err) {
    console.error('Ошибка при рассылке:', err.message);
    ctx.reply('Произошла ошибка при рассылке. Смотри логи.');
  }
});

// -------------------
// Запуск бота
// -------------------
bot.launch();
console.log('🤖 Бот запущен на Render. Чтобы остановить, нажмите Ctrl+C');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
