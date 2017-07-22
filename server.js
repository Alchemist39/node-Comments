var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('promise-mysql');

var app = express();
// подключаем бодипарсер, который разбирает тело запроса
app.use(bodyParser.urlencoded({
	extended: true
}));
// прослушиваем порт 3000
app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});
// создаем постоянный коннект с базой
var client;
mysql.createConnection({
	host : 'localhost',
	port :  '3306',
	user : 'root',
	password : '',
	database : 'comments',
}).then((conn) => {
	client = conn;
});
/*
client.query('SELECT pass FROM users WHERE login = \`тта\`', function(error, result, fields){
	console.log(JSON.stringify(result));
});
*/
app.get('/page/:page', function(req, res) {
	let count = 'SELECT COUNT(*) as total FROM comments';
	client.query(count)
		.then(([{total: tableLength}]) => {
			let maxPage = Math.round(tableLength / 10);

			let start = (req.params.page - 1) * 10;
			if(req.params.page > maxPage) {
				start = maxPage * 10;
			} else if(req.params.page < 1){
				start = 0;
			}

			let sql = mysql.format('SELECT name, comment, id FROM comments LIMIT 10 OFFSET ?', [start]);
			return client.query(sql);
		})
		.then((comments) => {
			let commentsHTML = '';
			for(let i = 0; i < comments.length; i++) {
				commentsHTML += `
					<p class="name">
						${comments[i].name}
					</p>
					<p class="text">
						${comments[i].id}
					</p>
					<p class="text">
						${comments[i].comment}
					</p>
				`;
			}
			res.send(`
				<html>
					<head>
						<title>Комментирование на NODE.js</title>
						<meta charset="utf-8">
						<link href="/css/bootstrap.min.css" rel="stylesheet">
						<link href="/main.css" rel="stylesheet">
					</head>
					<body>
						<div class="container">
							<div class="registration">
								<h2>Регистрация</h2>
								<form action="/reg" method="post">
									<p>
									<label>Ваш логин:<br></label>
									<input name="user[name]" type="text" size="32" maxlength="32">
									</p>
									<p>
									<label>Ваш пароль:<br></label>
									<input name="user[password]" type="pass" size="32" maxlength="32">
									</p>
									<p>
									<input type="email" name="user[email]" class="form-control" id="exampleInputEmail1" placeholder="jane.doe@example.com">
									</p>
									<p>
									<input type="submit" name="submit" value="Зарегистрироваться/войти">
									</p>
								</form>
							</div>
							<div class="comments">
								${commentsHTML}
							</div>

							<form class="form-inline" method="POST" action="/post.php">
								<div class="form-group">
									<label for="exampleInputName2">Name</label>
									<input type="text" name="name" class="form-control" id="exampleInputName2" placeholder="Jane Doe">
								</div>
								<div class="form-group">
									<label for="exampleInputEmail2">Email</label>
									<input type="email" name="email" class="form-control" id="exampleInputEmail2" placeholder="jane.doe@example.com">
								</div>
								<button type="submit" class="btn btn-default">Отправить сообщение</button></br>
								<p><a href="exit.php">выход</a></p>
								<textarea class="text_input" name="comment" rows="3"></textarea>
							</form>
						</div>
					</body>
				</html>
			`);
		})
});

app.get('/', function(req, res) {
	let sql = 'SELECT name, comment, id FROM comments LIMIT 10';
	client.query(sql, function(error, result, fields) {
		let comments = '';
		for(let i = 0; i < result.length ; i++) {
			comments += `
				<p class="name">
					${result[i].name}
				</p>
				<p class="text">
					${result[i].id}
				</p>
				<p class="text">
					${result[i].comment}
				</p>
			`;
		}
		res.send(`
			<html>
				<head>
					<title>Комментирование на NODE.js</title>
					<meta charset="utf-8">
					<link href="/css/bootstrap.min.css" rel="stylesheet">
					<link href="/main.css" rel="stylesheet">
				</head>
				<body>
					<div class="container">
						<div class="registration">
							<h2>Регистрация</h2>
							<form action="/reg" method="post">
								<p>
								<label>Ваш логин:<br></label>
								<input name="user[name]" type="text" size="32" maxlength="32">
								</p>
								<p>
								<label>Ваш пароль:<br></label>
								<input name="user[password]" type="pass" size="32" maxlength="32">
								</p>
								<p>
								<input type="email" name="user[email]" class="form-control" id="exampleInputEmail1" placeholder="jane.doe@example.com">
								</p>
								<p>
								<input type="submit" name="submit" value="Зарегистрироваться/войти">
								</p>
							</form>
						</div>
						<div class="comments">
							${comments}
						</div>

						<form class="form-inline" method="POST" action="/post.php">
							<div class="form-group">
								<label for="exampleInputName2">Name</label>
								<input type="text" name="name" class="form-control" id="exampleInputName2" placeholder="Jane Doe">
							</div>
							<div class="form-group">
								<label for="exampleInputEmail2">Email</label>
								<input type="email" name="email" class="form-control" id="exampleInputEmail2" placeholder="jane.doe@example.com">
							</div>
							<button type="submit" class="btn btn-default">Отправить сообщение</button></br>
							<p><a href="exit.php">выход</a></p>
							<textarea class="text_input" name="comment" rows="3"></textarea>
						</form>
					</div>
				</body>
			</html>
		`);
	});
});
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

// предоставляем к загрузке все файлы в каталоге client
app.use(express.static('client'));
