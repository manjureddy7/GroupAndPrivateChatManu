var express=require('express'),
	app=express(),
	server=require('http').createServer(app),
	io=require('socket.io').listen(server),
	mongoose=require('mongoose'),
	users={};


mongoose.connect('mongodb://localhost/chatting',function(err){
	if(err){
		console.log(err)
	}
	else{
		console.log("successfully connected to mongodb");
	}
});

var chatSchema=mongoose.Schema({
	nick:String,
	msg:String,
	created:{type:Date,default:Date.now}
});

var Chat=mongoose.model('Message',chatSchema);


app.get('/',function(req,res){
	res.sendFile(__dirname+'/index.html');
});

io.sockets.on('connection',function(socket){
	var query=Chat.find({});
	query.sort('-created').limit(8).exec(function(err,docs){
		if(err){
			throw err;
		}
		socket.emit('old messages',docs);
	});

	


	socket.on('new user',function(data,callback){
		if(data in users){
			callback(false);
		}
		else{
			callback(true);
			socket.nickname=data;
			users[socket.nickname]=socket;
			updateNicknames();
		}
	});

	function updateNicknames(){
		io.sockets.emit('usernames',Object.keys(users));
	}

	socket.on('send message',function(data,callback){
		var msg=data.trim();
		if(msg.substr(0,3) ==='/w '){
			msg=msg.substr(3);
			var ind=msg.indexOf(' ');
			if(ind !== -1){
				var name=msg.substr(0,ind);
				var msg=msg.substr(ind+1);
				if(name in users){
					console.log("Whisper");
					users[name].emit('whisper',{msg:msg,nick:socket.nickname})
					
				}
				else{
					callback('Error! Enter a valid user');
				}
				
			}else{
				callback('Error! Please enter your message to Whisper')
			}
		}
		else{
			var newMsg=new Chat({msg:msg,nick:socket.nickname});
			newMsg.save(function(err){
				if(err) throw err;
				io.sockets.emit('new message',{msg:msg,nick:socket.nickname});	
			});
			
			}
	});

	socket.on('disconnect',function(data){
		if(!socket.nickname){
			return;
		}
		delete users[socket.nickname];
		updateNicknames();
	});
});

server.listen(8000);
console.log("connections on..!!");
