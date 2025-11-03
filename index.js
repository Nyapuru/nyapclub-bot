const { Telegraf, Markup } = require('telegraf');
const admin = require('firebase-admin');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

// Firebase config через ENV
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig)
});

const db = admin.firestore();
const bot = new Telegraf(BOT_TOKEN);

// /start
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const userRef = db.collection('users').doc(String(userId));

  await userRef.set({
    name: ctx.from.first_name || 'друг',
    subscribed: true
  }, { merge: true });

  await ctx.replyWithPhoto(
    'https://i.ibb.co/9mRgh8VL/penguin.png',
    {
      caption: `Привет, ${ctx.from.first_name || 'друг'}! 🐧`,
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🐧 Разбудить Пингвина', 'https://nyapuru.github.io/testsite/')],
        [Markup.button.url('🌸 Канал', 'https://t.me/nyaplive')],
        [Markup.button.url('💬 Чат', 'https://t.me/nyapchat')]
      ])
    }
  );
});

// Рассылка
async function sendNotification(ctx, message, photo, link) {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply('Нет прав!');

  const users = await db.collection('users').where('subscribed', '==', true).get();
  let count = 0;

  for (const doc of users.docs) {
    try {
      await ctx.telegram.sendPhoto(doc.id, photo, {
        caption: message,
        ...Markup.inlineKeyboard([[Markup.button.url('📺 Смотреть', link)]])
      });
      count++;
      await new Promise(r => setTimeout(r, 50));
    } catch (err) {
      console.log(`Ошибка ${doc.id}:`, err.message);
    }
  }
  ctx.reply(`✅ Отправлено ${count} пользователям`);
}

bot.command('stream1', (ctx) => sendNotification(ctx, "🎥 Няп запустил стрим!", "https://i.ibb.co/WNwR2Jfp/41414144444422.jpg", "https://twitch.tv/nyapuru"));
bot.command('stream2', (ctx) => sendNotification(ctx, "🎥 Маня запустила стрим!", "https://i.ibb.co/3ycZ6CZj/555555555555555555.jpg", "https://twitch.tv/manyaunderscore"));

bot.launch();
console.log("✅ Бот запущен на Render!");

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

