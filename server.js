'use strict';
var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('promise-mysql');
var Promise = require("bluebird");
var session = require('express-session');

let crypto;
try {
  crypto = require('crypto');
} catch (err) {
  console.log('crypto support is disabled!');
}

var app = express();
app.use(session({
	secret: 'aple',
	resave: false,
	saveUninitialized: true
}));
// подключаем бодипарсер, который разбирает тело запроса
app.use(bodyParser.urlencoded({
	extended: true
}));
// прослушиваем порт 3000
app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});

app.get('/', function(req, res, next) {
	var sess = req.session;
	if (sess.views) {
		sess.views++;
		res.end();
	} else {
		sess.views = 1;
	}
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
let registrationHTML = `
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
`;

app.get('/page/:page', function(req, res) {
	let count = 'SELECT COUNT(*) as total FROM comments';
	client.query(count).then(([{total: tableLength}]) => {
		let maxPage = Math.ceil(tableLength / 10);

		let currentPage = req.params.page;

		let start = (currentPage - 1) * 10;
		if(currentPage > maxPage) {
			start = maxPage * 10;
		} else if(currentPage < 1){
			start = 0;
		}
		let pagesHTML = '';
		for(let i = 1; i <= maxPage; i++) {
			if(currentPage == i) {
				pagesHTML += i;
			} else {
				pagesHTML += `<a href="/page/${i}">${i}</a>`;
			}
		}

		let sql = mysql.format('SELECT name, comment, id FROM comments LIMIT 10 OFFSET ?', [start]);

		return Promise.props({
			comments: client.query(sql),
			pagesHTML
		});
	}).then(({pagesHTML, comments}) => {
		let commentsHTML = '';
		for(let {name, id, comment} of comments) {
			commentsHTML += `
				<p class="name">
					${name}
				</p>
				<p class="text">
					${id}
				</p>
				<p class="text">
					${comment}
				</p>
			`;
		}
		let name = req.session.name || '';
		let email = req.session.email || '';
		if(req.session.name) {
			registrationHTML = '';
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
						${registrationHTML}
						<div class="comments">
							${commentsHTML}
						</div>
						<div class="pages">
							${pagesHTML}
						</div>

						<form class="form-inline" method="POST" action="/post">
							<div class="form-group">
								<label for="exampleInputName2">Name</label>
								<input type="text" value="${name}" name="user[name]" class="form-control" id="exampleInputName2" placeholder="Jane Doe">
							</div>
							<div class="form-group">
								<label for="exampleInputEmail2">Email</label>
								<input type="email" value="${email}" name="user[email]" class="form-control" id="exampleInputEmail2" placeholder="jane.doe@example.com">
							</div>
							<button type="submit" class="btn btn-default">Отправить сообщение</button></br>
							<p><a href="/exit">выход</a></p>
							<textarea class="text_input" name="user[comment]" rows="3"></textarea>
						</form>
					</div>
				</body>
			</html>
		`);
	})
});
app.get('/exit', function(req, res) {
	req.session.name = null;
	req.session.email = null;
	res.set({
		refresh: '2;url=/page/4'
	});

	res.sendFile( __dirname + '/client/index.html');
})

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
						${registrationHTML}
						<div class="comments">
							${comments}
						</div>

						<form class="form-inline" method="POST" action="/post">
							<div class="form-group">
								<label for="exampleInputName2">Name</label>
								<input type="text" name="user[name]" class="form-control" id="exampleInputName2" placeholder="Jane Doe">
							</div>
							<div class="form-group">
								<label for="exampleInputEmail2">Email</label>
								<input type="email" name="user[email]" class="form-control" id="exampleInputEmail2" placeholder="jane.doe@example.com">
							</div>
							<button type="submit" class="btn btn-default">Отправить сообщение</button></br>
							<p><a href="exit.php">выход</a></p>
							<textarea class="text_input" name="user[comment]" rows="3"></textarea>
						</form>
					</div>
				</body>
			</html>
		`);
	});
});
var sha512 = function(password, salt){
	let hash = crypto.createHmac('sha512', salt); // Hashing algorithm sha512 
	hash.update(password);
	let value = hash.digest('hex');
	return {
		salt:salt,
		passwordHash:value
	};
};

var saltHashPassword = function (userpassword) {
	let salt = 'aasdsidj9182u1j2'; 
	let passwordData = sha512(userpassword, salt);
	return passwordData.passwordHash;
};
// при получении POST запроса вставляем данные в таблицу через placeholder
app.post('/reg', function(request, response){
	let sql = mysql.format('SELECT login FROM users WHERE login = ?', [request.body.user.name]);
	client.query(sql, function(error, result, fields){
		if(result.length > 0) {
			let passMatch = mysql.format('SELECT pass, email FROM users WHERE login = ?', [request.body.user.name]);
			client.query(passMatch, function(error, result, fields){
				let hashedPassword = saltHashPassword(request.body.user.password);
				if(hashedPassword === result[0].pass) {
					console.log('С возвращением, ' + request.body.user.name);
					request.session.name = request.body.user.name;
					request.session.email = result[0].email;
				} else {
					console.log('Неверный пароль');
				}
			});
		} else {
			let hashedPassword = saltHashPassword(request.body.user.password)
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
				hashedPassword,
				request.body.user.email
			]));
			request.session.name = request.body.user.name;
			request.session.email = request.body.user.email;
			console.log('пользователь зарегистрирован');
		}
	});
	// меняем ссылку на стартовую во избежание повторной отправки запроса
	response.set({
		refresh: '2;url=/page/4'
	});
	// отправляем файл стартовой страницы
	response.sendFile( __dirname + '/client/index.html');
});

app.post('/post', function(request, response){
	client.query(mysql.format(`
		INSERT INTO comments (
			\`name\`,
			\`email\`,
			\`comment\`
		)
		VALUES (
			?,
			?,
			?
		);
	`,  [
		request.body.user.name,
		request.body.user.email,
		request.body.user.comment
	]));
	// меняем ссылку на стартовую во избежание повторной отправки запроса
	response.set({
		refresh: '2;url=/page/4'
	});
	// отправляем файл стартовой страницы
	response.sendFile( __dirname + '/client/index.html');
});
/*
var genRandomString = function(length){
	return crypto.randomBytes(Math.ceil(length/2))
			.toString('hex') // convert to hexadecimal format 
			.slice(0,length);   // return required number of characters 
};*/



// предоставляем к загрузке все файлы в каталоге client
app.use(express.static('client'));
