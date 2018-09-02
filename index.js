var TelegramBot = require('node-telegram-bot-api');

var bot = new TelegramBot('640746920:AAGXCQjVubGbqsf-EHnTrwbVgQJ4ZDQ9DOk', {polling:true});

bot.onText(/\/echo (.+)/, function (msg, match) {
    var fromId = msg.from.id;
    var resp = match[1];
    bot.sendMessage(fromId, resp);
});

bot.onText(/\/kek (.+)/, function (msg, match) {
  var fromId = msg.from.id;
  var resp = match[1];
  bot.sendMessage(fromId, resp);
});