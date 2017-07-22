var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');

var app = express();
// предоставляем к загрузке все файлы в каталоге client
app.use(express.static('client'));
// при загрузке страницы возвращаем файл стартовой страницы
app.get('/', function(req, res){
    res.sendFile( __dirname + '/client/index.html');
});
// подключаем бодипарсер, который разбирает тело запроса
app.use(bodyParser.urlencoded({
	extended: true
}));
// прослушиваем порт 3000
app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
// создаем постоянный коннект с базой
var client = mysql.createConnection({
	host : 'localhost',
	port :  '3306',
	user : 'root',
	password : '',
	database : 'comments',
});
/*
client.query('SELECT pass FROM users WHERE login = \`тта\`', function(error, result, fields){
	console.log(JSON.stringify(result));
});
*/
/*
app.post('/', function(req, res) {
	let sql = 'SELECT name, comment FROM comments';
	client.query(sql, function(error, result, fields){
		for(let i = 0; i <= result.length; i++) {
			
		}
	});
});*/
// при получении POST запроса вставляем данные в таблицу через placeholder
app.post('/reg', function(request, response){
	let sql = mysql.format('SELECT login FROM users WHERE login = ?', [request.body.user.name]);
	client.query(sql, function(error, result, fields){
		if(result.length > 0) {
			console.log('пользователь существует');
		} else {
			client.query(mysql.format(`
				INSERT INTO users (
					\`login\`,
					\`pass\`,
					\`email\`
				)
				VALUES (
					?,
					?,
					?
				);
			`,  [
				request.body.user.name,
				request.body.user.password,
				request.body.user.email
			]));
			console.log('пользователь зарегистрирован');
		}
	});
	// меняем ссылку на стартовую во избежание повторной отправки запроса
	response.set({
		refresh: '2;url=/'
	});
	// отправляем файл стартовой страницы
	response.sendFile( __dirname + '/client/index.html');
});
