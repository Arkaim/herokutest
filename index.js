
const TOKEN = '586469686:AAG02bEenGq3uAz5Y-PZRZLCsieMLa8NsrU';
var TelegramBot = require('node-telegram-bot-api');
const options = {
  webHook: {
    // Port to which you should bind is assigned to $PORT variable
    // See: https://devcenter.heroku.com/articles/dynos#local-environment-variables
    port: process.env.PORT
    // you do NOT need to set up certificates since Heroku provides
    // the SSL certs already (https://<app-name>.herokuapp.com)
    // Also no need to pass IP because on Heroku you need to bind to 0.0.0.0
  }
};
// Heroku routes from port :443 to $PORT
// Add URL of your app to env variable or enable Dyno Metadata
// to get this automatically
// See: https://devcenter.heroku.com/articles/dyno-metadata
const url = process.env.APP_URL || 'https://slayerbot2018.herokuapp.com:443';
const bot = new TelegramBot(TOKEN, options);


// This informs the Telegram servers of the new webhook.
// Note: we do not need to pass in the cert, as it already provided
bot.setWebHook(`${url}/bot${TOKEN}`);


// Just to ping!
const hellomsg = 'This is slayer test bot'
var firebase = require('firebase');
var config = {
	apiKey: "AIzaSyAVrpgXMgkKj-ytkYQft83giJ3dQdLMSCo",
	authDomain: "slayertest-88ba4.firebaseapp.com",
	databaseURL: "https://slayertest-88ba4.firebaseio.com",
	projectId: "slayertest-88ba4",
	storageBucket: "slayertest-88ba4.appspot.com",
	messagingSenderId: "520429235137"
};
var app = firebase.initializeApp(config);
var database = firebase.database();
const adminChatId = 100491880; //may change
const rules = 'Rules';

bot.onText(/\/start/, msg => {
	bot.sendMessage(msg.chat.id, hellomsg);
});

bot.on('photo', (msg) => {
	if (msg.chat.id === adminChatId) {
		var ref = database.ref('players')
		var player_id = Math.random().toString(36).slice(2).substr(0,6);

		if (msg.caption !== "") {
			var info = msg.caption;
			info = info.replace(/ /g,'');
			var arr = info.split(',');
			if (arr.length === 4) {
				ref.child(player_id).child("fname").set(arr[0]);
				ref.child(player_id).child("lname").set(arr[1]);
				ref.child(player_id).child("faculty").set(arr[2]);
				ref.child(player_id).child("year").set(arr[3]);
				ref.child(player_id).child("photo_id").set(msg.photo[msg.photo.length - 1].file_id);
				ref.child(player_id).child("status").set('alive');
				ref.child(player_id).child("killcount").set(0);
				bot.sendMessage(msg.chat.id, 'Пользователь успешно зарегистрирован');
			} else {
				bot.sendMessage(msg.chat.id, 'Регистрация не удалась. Вы некорректно ввели данные');
			}
		} else {
			bot.sendMessage(msg.chat.id, 'Регистрация не удалась. Нет описания к фотке');
		}
	} else {
		bot.sendMessage(msg.chat.id, 'Регистрация не удалась. Вы не админ');
	}
});

bot.onText(/\/me/, msg => {
	var id = msg.text.slice(4);
	id = id.trim();
	var ref = database.ref('/players/' + id);

	ref.once('value', function(snapshot) {
		var test = snapshot.val();
		if (test === null) {
			bot.sendMessage(msg.chat.id, 'Регистрация не удалась, проверьте правильность команды.');
		}
		else {
			ref.child('chat_id').set(msg.chat.id);
			bot.sendMessage(msg.chat.id, 'Вы успешно зарегистрировались. Ожидайте начала игры.');
		}
	});

	var refChatsList = database.ref('chats/' + msg.chat.id);
	refChatsList.set(id);
});

bot.onText(/\/begin_game/, msg => {
	if (msg.chat.id === adminChatId) {
		var ref = database.ref('/players');
		ref.once('value', function(snapshot) {
			var players = [];
			
			snapshot.forEach(function(childSnapshot) {
				var chat_id = childSnapshot.val().chat_id;
				if (chat_id !== undefined) {
					players.push(childSnapshot);
				}
			});

			for (var i = 0; i < players.length; i++) {
				(function(i) {
					setTimeout(function() {
						bot.sendMessage(players[i].val().chat_id, 'Игра началсь, ' + players[i].val().fname + '! \n' + 'Скоро вам выдадут жертву!');
					}, 1000);
				}(i));
			}

			players = shuffle(players);

			for (var i = 0; i < players.length-1 ; i++) {
				(function(i) {
					setTimeout(function() {
						var newRef = database.ref('/players/' + players[i].key + '/victim');
						newRef.set(players[i+1].key);
						bot.sendPhoto(players[i].val().chat_id, players[i+1].val().photo_id, {caption:  
																'Ваша жертва: \n'   + players[i+1].val().fname + ' '
																					+ players[i+1].val().lname + ', '
																					+ players[i+1].val().faculty + ', '
																					+ players[i+1].val().year });
					}, 1000);
				}(i));
			}

			var lastPlayer = database.ref('/players/' + players[players.length-1].key + '/victim');
			lastPlayer.set(players[0].key);
			bot.sendPhoto(players[players.length-1].val().chat_id, players[0].val().photo_id, {caption:  
																'Ваша жертва: \n'   + players[0].val().fname + ' '
																					+ players[0].val().lname + ', '
																					+ players[0].val().faculty + ', '
																					+ players[0].val().year });	
		});
	}
});

bot.onText(/\/kill/, msg => {
	var id = msg.text.slice(6);
	id = id.trim();
	var victimRef = database.ref('/players/' + id);

	victimRef.once('value', function(snapshot) {
		var test = snapshot.val();
		if (test === null) {
			bot.sendMessage(msg.chat.id, 'Убийство не удалось, проверьте правильность команды.');
		} else {
			var killerChatRef = database.ref('chats/' + msg.chat.id);
			killerChatRef.once('value', function(killerChatRefSnap) {
				var killer_id = killerChatRefSnap.val();
				var killerRef = database.ref('players/' + killer_id);
				killerRef.once('value', function(killerSnap) {
					if (killerSnap.val().status === 'alive') {
						var victim_id = killerSnap.val().victim;
						var selfKIll = 'Не знаете ли, что тела ваши суть храм живущего в вас Святого Духа, Которого имеете вы от Бога, и вы не свои? Ибо вы куплены дорогою ценою';
						if (id === killerSnap.key) {
							bot.sendMessage(msg.chat.id, selfKIll);
						} 
						else if (id === victim_id) {
							var killer_killcount = killerSnap.val().killcount;
							var killerKillCountRef = database.ref('players/' + killer_id + '/killcount');
							killerKillCountRef.set(parseInt(killer_killcount)+1);
							var killerKillListRef = database.ref('players/' + killer_id + '/kills/' + new Date());
							killerKillListRef.set(victim_id);

							var victimStatusRef = database.ref('players/' + victim_id + '/status');
							victimStatusRef.set('dead');
							bot.sendMessage(snapshot.val().chat_id, 'Вы были убиты!');

							var nextVictimRef = database.ref('players/' + snapshot.val().victim);
							nextVictimRef.once('value', function(nextVictimSnap) {
								var newKillerVictimRef = database.ref('players/' + killer_id + '/victim');
								newKillerVictimRef.set(nextVictimSnap.key);	
								var newKillerVictimInfo = nextVictimSnap.val().fname + ' ' 
														+ nextVictimSnap.val().lname + ', '
														+ nextVictimSnap.val().faculty + ', '
														+ nextVictimSnap.val().year;

								bot.sendMessage(msg.chat.id, 'Вы убили свою жертву!');
								setTimeout(function() {
									bot.sendPhoto(msg.chat.id, nextVictimSnap.val().photo_id, {caption: 'Ваша следующая жертва \n' 
																										+ newKillerVictimInfo});
								}, 2000);
							});
						} else {
							bot.sendMessage(msg.chat.id, 'Убийство не удалось, проверьте правильность команды.');
						}
					} else {
						bot.sendMessage(msg.chat.id, 'Вы мертвы');
					}					
				});
			});
		}
	});
});

bot.onText(/\/code/, msg => {
	var chatIdRef = database.ref('chats/' + msg.chat.id);
	chatIdRef.once('value', function(snapshot) {
		if (snapshot.val() === null) {
			bot.sendMessage(msg.chat.id, 'Вы не зарегистрированы');
		} else {
			bot.sendMessage(msg.chat.id, 'Ваш секретный код: ' + snapshot.val());
		}
	});
});

bot.onText(/\/stats/, msg => {
	var chatIdRef = database.ref('chats/' + msg.chat.id);
	chatIdRef.once('value', function(snapshot) {
		if (snapshot.val() === null) {
			bot.sendMessage(msg.chat.id, 'Вы не зарегистрированы');
		} else {
			var playerRef = database.ref('players/' + snapshot.val());
			playerRef.once('value', function(playerSnap) {
				bot.sendMessage(msg.chat.id, 	'Имя: ' + playerSnap.val().fname + '\n' +
												'Фамилия: ' + playerSnap.val().lname + '\n' + 
												'Факультет: ' + playerSnap.val().faculty + '\n' + 
												'Год обучения: ' + playerSnap.val().year + '\n' + 
												'Статус: ' + playerSnap.val().status + '\n' + 
												'Количество убийств: ' + playerSnap.val().killcount);
			});
		}
	});
});

bot.onText(/\/rules/, msg => {
	bot.sendMessage(msg.chat.id, rules);
});

bot.onText(/\/report/, msg => {
	var reportText = msg.text.slice(7);
	if (reportText !== '') {
		bot.sendMessage(adminChatId, 'Report from ' + msg.chat.id + '\n' + reportText);
	}
});

bot.onText(/\/broadcast/, msg => {
	if (msg.chat.id === adminChatId) {
		var broadcastMsg = msg.text.slice(11);
		if (broadcastMsg !== '') {
			var registeredChatsRef = database.ref('chats');
			registeredChatsRef.once('value', function(snapshot) {
				snapshot.forEach(function(childSnapshot) {
					//todo: test it
					setTimeout(function() {
						bot.sendMessage(childSnapshot.key, broadcastMsg);
					}, 1000);
				});
			});

		}
	}
});

bot.onText(/\/delete/, msg => {
	if (msg.chat.id === adminChatId) {
		if (msg.text[7] === " ") {
			var id = msg.text.slice(8)
			if (id !== "") {
				var playerRef = database.ref('/players/' + id);
				playerRef.child('status').set('dead');
				playerRef.once('value', function(snapshot) {
					var chat_id = snapshot.val().chat_id;
					bot.sendMessage(chat_id, 'Вы были дисквалифицированы');
					var victim_id = snapshot.val().victim;
					var prevKiller_id = '';

					var playersRef = database.ref('/players');
					playersRef.once('value', function(snapshot) {
						snapshot.forEach(function(childSnapshot) {
							if (childSnapshot.val().victim === id) {
								var prevKillersVictimRef = database.ref('/players/' + childSnapshot.key + '/victim');
								prevKillersVictimRef.set(victim_id);
								bot.sendMessage(childSnapshot.val().chat_id, 'Ваша жертва была дисквалифицирована.');
								var newVictimRef = database.ref('/players/' + victim_id);
								newVictimRef.once('value', function(newVictimSnap) {
									var newVictimInfo = newVictimSnap.val().fname + ' ' + newVictimSnap.val().lname + '\n'
														+ newVictimSnap.val().faculty + ', ' + newVictimSnap.val().year;
									setTimeout(function() {
										bot.sendPhoto(childSnapshot.val().chat_id, newVictimSnap.val().photo_id, {caption: 
											'Ваша новая жертва \n' + newVictimInfo});
									}, 2000);
								});
							}
						});
					});
				});
			}		
		}
	}
});

bot.onText(/\/top/, msg => {
	var playersRef = database.ref('/players');
	playersRef.once('value', function(snapshot) {
		var players = [];
		snapshot.forEach(function(childSnapshot) {
			if (childSnapshot.val().status === 'alive') {
				players.push(childSnapshot.val());
			}
		});
		players.sort(function(a, b){
			return parseInt(a.killcount) < parseInt(b.killcount);
		});
		var len = players.length;
		if (len > 10) 
			len = 10;
		var str = 'Топ 10 игроков: \n\n';
		for (var i = 0; i < len; i++) {
			str += (i + 1) + '. ' + players[i].fname + ' ' + players[i].lname + ', '
								+ ' ' + players[i].faculty + ', ' + players[i].year + ' курс, '
							  + players[i].killcount + ' убийств' + '\n\n';
		}
		bot.sendMessage(msg.chat.id, str);
	});
});

function shuffle(arr) {
    var cnt = arr.length, temp, index;
    while (cnt > 0) {
        index = Math.floor(Math.random() * cnt);
        cnt--;
        temp = arr[cnt];
        arr[cnt] = arr[index];
        arr[index] = temp;
    }
    return arr;
}




/*
1) Регистрация
	а) Игрок приходит в стекляшку
	б) Админ его фоткает и отправляет боту фотку с ФИО, факультет, курс
	в) Бот создает объект игрока в базе с уникальным id

2) Конец регистрации
	а) Игроки приходят в стекляшку за своим id и ссылкой на бота
	б) Игроки отправляют боту свой id (/me "id")
	в) Бот запоминает их в поле chat_id
	г) Бот оповещает игроков о времени старта игры и объясняет правила игры

3) Начало игры
	а) Админ оповещает игроков о скором старте игры (/broadcast "text")
	б) Админ запускает игру (/begin_game)
	в) Игрокам приходит сообщение о старте игры
	г) Игрокам приходит сообщение с фотографией и информацией о жертве

4) Ход игры
	а) Игрок убивает жертву
	б) Жертва отправляет боту команду (/code)
	в) Убийца отправляет боту команду (/kill "code")
	г) Жертве приходит сообщение - "Вас убили"
	д) Убийце приходит сообщение о следующей жертве


Команды админа:

/register photo (description - firstname, lastname, faculty, year) 
/delete player_id 
/begin_game 
/broadcast text (рассылка)
/top (выдает топ 10 живых игроков по убийствам (число можно поменять))
/rules 

Команды игрока: 

/me id 
/kill id 
/code (показывает код игрока)
/top (выдает топ 10 живых игроков по убийствам (число можно поменять))
/stats (информация об игроке)
/report text (сообщение админу (хз нужно или нет))
/rules 

*/