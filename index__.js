const {
	WAConnection,
	MessageType,
	MessageOptions,
	Presence,
	Mimetype,
	WALocationMessage,
	WA_MESSAGE_STUB_TYPES,
	ReconnectMode,
	ProxyAgent,
	waChatKey,
} = require("@adiwajshing/baileys");
const http = require("http");
const https = require("https");
const qrcode = require('qrcode');
const fs = require("fs");
const { body, validationResult } = require('express-validator');
const express = require('express');
const axios = require("axios");
const mysql = require('mysql2');
const app = express();
const server = http.createServer(app);
const socketIO = require('socket.io');
const { phoneNumberFormatter } = require('./helper/formatter');
const io = socketIO(server);
const request = require("request");
const path = require("path");
const mergeJSON = require("merge-json") ;
const dirPath = path.join(__dirname,"/");
const date_ob = new Date();
//Create Connection
// const con = mysql.createConnection({
// host: 'localhost',
// user: 'root',
// password: 'print!',
// database: 'db_print'
// });
const db = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'print!',
	database: 'db_print'
})

// Log any errors connected to the db
db.connect(function(err){
    if (err) console.log(err)
})
// var Contacts = []
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

let rawdata = fs.readFileSync('config.json');
let hook = JSON.parse(rawdata);

const configs = {
	port: 3000, // custom port to access server
	webhook_url: hook.webhook_url,
	webhook_group: hook.webhook_group // webhook url
};
const conn = new WAConnection();
const execPHP = require('./execphp.js')();

execPHP.phpFolder = dirPath;
app.use('*.php', function (request, response, next) {
	execPHP.parseFile(request.originalUrl, function (phpResult) {
		response.write(phpResult);
		response.end();
	});
});

const SESSION_FILE = hook.session_file;

app.get('/', (req, res) => {
	res.sendFile('index.html', {
		root: __dirname
	});
});

//conn.autoReconnect = ReconnectMode.onAllErrors;
conn.autoReconnect = ReconnectMode.onConnectionLost;
// conn.connectOptions = { reconnectID: "reconnect" };


async function connect() {
	fs.existsSync(SESSION_FILE) && conn.loadAuthInfo(SESSION_FILE);
	await conn.connect({ timeoutMs: 30 * 1000 });
	console.log("oh hello " + conn.user.name + " (" + conn.user.jid + ")");
	io.emit('authenticated', "oh hello " + conn.user.name + " (" + conn.user.jid + ")")
}

conn.on("credentials-updated", async () => {
	const authInfo = conn.base64EncodedAuthInfo(); // get all the auth info we need to restore this session
	fs.writeFileSync(SESSION_FILE, JSON.stringify(authInfo, null, '\t')) // save this info to a file
})

connect().catch((err) => {
	console.log(err);
});

io.on("connection", function (socket) {
	socket.on('data_masuk', (data) => {
        io.emit('data_masuk', data)
	})
	
    socket.on('data_masuk', (data) => {
        socket.broadcast.emit("reload",data);
	})
    socket.on('buka', () => {
        socket.broadcast.emit("buka");
	})    
    socket.on('ambil', () => {
        socket.broadcast.emit("ambil");
	})
    socket.on('bukat', () => {
        socket.broadcast.emit("bukat");
	})
    socket.on('hapus', () => {
        socket.broadcast.emit("hapus");
	})
    socket.on('lock', () => {
        socket.broadcast.emit("lock");
	})
    socket.on('teredit', () => {
        socket.broadcast.emit("teredit");
	})
    socket.on('lunas', () => {
        socket.broadcast.emit("lunas");
	})
    socket.on('terbuka', () => {
        socket.broadcast.emit("terbuka");
	})
    socket.on('gagal', (data) => {
        socket.broadcast.emit("gagal",data);
	})
    
    socket.on('global', (data) => {
        socket.broadcast.emit("global",data);
	})
	socket.on('ready', () => {
		if (fs.existsSync(SESSION_FILE) && conn.state == 'open') {
			io.emit('authenticated', "oh hello " + conn.user.name + " (" + conn.user.jid + ")")
			io.emit('status', 'ok')
			} else {
			io.emit('status', 'load')
			io.emit('loader', '')
			socket.emit('message', 'Please wait..')
			connect()
		}
	})
	
	conn.on("qr", (qr) => {
		socket.emit('message', 'Getting QR Code')
		qrcode.toDataURL(qr, (err, url) => {
			socket.emit('message', 'QR Code received, scan please!')
			console.log(qr);
			socket.emit("qr", url);
		});
	});
	
	socket.on('logout', () => {
		if (fs.existsSync(SESSION_FILE)) {
			conn.close()
			conn.clearAuthInfo();
			fs.unlinkSync(SESSION_FILE);
			socket.emit('isdelete', '<h2 class="text-center text-info mt-4">Logout Success, Lets Scan Again<h2>')
			} else {
			socket.emit('isdelete', '<h2 class="text-center text-danger mt-4">You are have not Login yet!<h2>')
		}
	})
	
	socket.on('scanqr', () => {
		if (fs.existsSync(SESSION_FILE) && conn.state == 'open') {
			io.emit('authenticated', "oh hello " + conn.user.name + " (" + conn.user.jid + ")")
			} else {
			io.emit('loader', '')
			socket.emit('message', 'Please wait..')
			connect()
		}
	})
	socket.on('cekstatus', (data) => {
		if (fs.existsSync(SESSION_FILE) && conn.state == 'open') {
			io.emit('status', 'running')
			io.emit('isdelete', '<h2 class="text-center text-primary mt-4">Your whatsapp is Running!</h2>')
			} else {
			io.emit('status', 'stopped')
			io.emit('isdelete', '<h2 class="text-center text-danger mt-4">Your whatsapp is not Running!,Scan Now!<h2>')
		}
	})
	
	
});
conn.on('chat-update', chatUpdate => {
	if (chatUpdate.messages && chatUpdate.count) {
		const message = chatUpdate.messages.all()[0]
		// console.log (message)
		
		const idm = message.key.id
		const nomor = message.key.remoteJid
		
		
		if (message.key) {
			message.chat = message.key.remoteJid
			message.isGroup = message.chat.endsWith('@g.us')
		}
		//isgroup
		if (message.isGroup==true){
			var g = 1;
			var myarr = nomor.split("-");
			var mynomor = myarr[0]
			// console.log(`satu`);
			// var isi = message.message.conversation;
			}else{
			var g = 0;
			var myarr = nomor.split("@");
			var mynomor = myarr[0]
			// var isi = message.message.conversation;
			// console.log(`dua`);
		}
		if (!isNaN(mynomor)) {
			const nama = conn.contacts[nomor].name
			// const ppurl = conn.getProfilePicture(nomor) 
			const second = {name:nama}
			const merged = Object.assign({}, message, second) 
			const jmerged = JSON.stringify(merged);
			const data = {name: nama, number: mynomor,createdAt:date_ob,isGroup:g};
			const query = db.query('SELECT id,number FROM `Contacts` WHERE `number` = ?',mynomor,function (error, rows) {
				// console.log(`satu` +rows[0].id);
				io.emit('chatu', merged)
				if (!rows.length)
				{
					
					const query = db.query('INSERT INTO Contacts SET ?', data, function (error, results, fields) {
						if (error) throw error;
						const inid = results.insertId
						const pesan = {id: idm, json: jmerged,createdAt:date_ob,contactId:inid};
						db.query('INSERT INTO Messages SET ?', pesan, function (error, results, fields) {
							if (error) throw error;
						});
					});
					
					}else{
					const ctId = rows[0].id;
					db.query('UPDATE Contacts SET name = ?, updatedAt = ?, isGroup = ? WHERE number = ?', [nama, date_ob,g, mynomor], function (error, results, fields) {
						if (error) throw error;
					});
					const pesan = {id: idm, json: jmerged,createdAt:date_ob,contactId:ctId};
					db.query('INSERT INTO Messages SET ?', pesan, function (error, results, fields) {
						if (error) throw error;
					});
				}
			});
		}
		
		// console.log(query.db);
		// db.query('INSERT INTO Contacts (`name`,`number`,`createdAt`,`isGroup`) VALUES (?,?,?,?)', data.note)
	} else console.log (chatUpdate) // see updates (can be archived, pinned etc.)
})
conn.on('chats-received', async ({ hasNewChats }) => {
	const unread = await conn.loadAllUnreadMessages();
	io.emit('chats', unread)
	// console.log ("you have " + unread.length + " unread messages") 
})
conn.on('contacts-received', (data) => {
	io.emit('kontak', Object.keys(conn.contacts).length)
	// console.log('you have ' + Object.keys(conn.contacts).length + ' contacts')
})

conn.on('close', ({ reason }) => {
	// console.log(reason);
	if (reason == 'invalid_session') {
		if (fs.existsSync(SESSION_FILE)) {
			conn.close()
			conn.clearAuthInfo();
			fs.unlinkSync(SESSION_FILE);
			socket.emit('message', 'Connection lost..!')
			connect();
		}
	}
})

// send message
app.post('/v2/send-message', [
	body('number').notEmpty(),
	body('message').notEmpty(),
	], async (req, res) => {
	const errors = validationResult(req).formatWith(({
		msg
	}) => {
	return msg;
	});
	
	if (!errors.isEmpty()) {
		return res.status(422).json({
			status: false,
			message: errors.mapped()
		});
	}
	const message = req.body.message;
	if (req.body.number.length > 15) {
		var number = req.body.number;
		conn.sendMessage(number, message, MessageType.text).then(response => {
			res.status(200).json({
				status: true,
				response: response
			});
			}).catch(err => {
			res.status(500).json({
				status: false,
				response: err
			});
		});
		return
		} else {
		var number = phoneNumberFormatter(req.body.number);
	}
	
	var numberExists = await conn.isOnWhatsApp(number);
	if (!numberExists) {
		return res.status(422).json({
			status: false,
			message: 'The number is not registered'
		});
	}
	conn.sendMessage(number, message, MessageType.text).then(response => {
		res.status(200).json({
			status: true,
			response: response
		});
		}).catch(err => {
		res.status(500).json({
			status: false,
			response: err
		});
	});
});
app.get('/v2/getchatbyid/:phone', async (req,res) => {
    let phone = req.params.phone;
    if(phone==undefined){
        res.send({status:"error",message:"please enter valid phone number"});
		}else{
        conn.loadMessages(phone+"@c.us").then((chat) => {
            res.send({ status:"success", message: chat});
			}).catch(() => {
            console.error("getchaterror")
            res.send({status:"error",message:"getchaterror"})
		})
	}
});
// app.get('/v2/getpesan/:phone', async (req,res) => {
// let phone = req.params.phone;
// if(phone==undefined){
// res.send({status:"error",message:"please enter valid phone number"});
// }else{
// await conn.loadAllMessages ("xyz@c.us", message => {
// res.send({ status:"success", message: message.key.id});
// }).catch(() => {
// console.error("getchaterror")
// res.send({status:"error",message:"getchaterror"})
// })
// }
// });
app.get('/v2/getstatus/:phone', async (req,res) => {
    let phone = req.params.phone;
    if(phone!=undefined){
        conn.getStatus(phone+'@c.us').then((contact) => {
            res.send(JSON.stringify(contact));
			}).catch((err) => {
            res.send({status:'error',contact:'Not found'});
		});
	}
});
// send media
app.post('/v2/send-media', [
	body('number').notEmpty(),
	body('url').notEmpty(),
	body('filetype').notEmpty(),
	], async (req, res) => {
	const errors = validationResult(req).formatWith(({
		msg
	}) => {
	return msg;
	});
	if (!errors.isEmpty()) {
		return res.status(422).json({
			status: false,
			message: errors.mapped()
		});
	}
	const getBuffer = async (url, options) => {
		try {
			options ? options : {}
			const res = await axios({
				method: "get",
				url,
				...options,
				responseType: 'arraybuffer'
			})
			return res.data
			} catch (e) {
			console.log(`Error : ${e}`)
		}
	}
	if (fs.existsSync(SESSION_FILE)) {
		const number = phoneNumberFormatter(req.body.number);
		const url = req.body.url;
		const filetype = req.body.filetype;
		const filename = req.body.filename;
		const caption = req.body.caption;
		if (filetype == 'pdf' || filetype == 'docx' || filetype == 'doc') {
			const buffer = await getBuffer(url);
			conn.sendMessage(number, buffer, MessageType.document, { mimetype: 'pdf/docx', filename: filename + '.' + filetype }).then(response => {
				return res.status(200).json({
					status: true,
					response: response
				});
				}).catch(err => {
				return res.status(500).json({
					status: false,
					response: err
				});
				console.log('gagal')
			});
			} else if (filetype == 'mp3') {
			const voice = req.body.voice;
			const buffer = await getBuffer(url);
			conn.sendMessage(number, buffer, MessageType.audio, { mimetype: Mimetype.mp4Audio, ptt: voice }).then(response => {
				return res.status(200).json({
					status: true,
					response: response
				});
				fs.unlinkSync(mediaName);
				
				}).catch(err => {
				return res.status(500).json({
					status: false,
					response: err
				});
				console.log('gagal')
			});
			} else if (filetype == 'gif') {
			const buffer = await getBuffer(url);
			conn.sendMessage(number, mediaBuffer, MessageType.video, { Mimetype: Mimetype.gif,caption:caption }).then(response => {
				return res.status(200).json({
					status: true,
					response: response
				});
				fs.unlinkSync(mediaName);
				
				}).catch(err => {
				return res.status(500).json({
					status: false,
					response: err
				});
				console.log('gagal')
			});
			} else if (filetype == 'webp') {
			const buffer = await getBuffer(url);
			conn.sendMessage(number, mediaBuffer, MessageType.sticker).then(response => {
				return res.status(200).json({
					status: true,
					response: response
				});
				fs.unlinkSync(mediaName);
				
				}).catch(err => {
				return res.status(500).json({
					status: false,
					response: err
				});
				console.log('gagal')
			});
			} else if (filetype == 'jpg' || filetype == 'jpeg' || filetype == 'png') {
			var messageOptions = {caption:caption};
			const buffer = await getBuffer(url)
			conn.sendMessage(number, buffer, MessageType.image, messageOptions).then(response => {
				res.status(200).json({
					status: true,
					response: response
				});
				fs.unlinkSync(mediaName);
				
				}).catch(err => {
				res.status(500).json({
					status: false,
					response: err
				});
			});
			
		}
		} else {
		res.writeHead(401, {
			'Content-Type': 'application/json'
		});
		res.end(JSON.stringify({
			status: false,
			message: 'Please scan the QR before use the API'
		}));
	}
});

//group-participants-update
// const findGroupByName = async function(name) {
// const group = await conn.loadMessages ().then(chats => {
// return chats.find(chat => 
// chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
// );
// });
// return group;
// }

// app.post('/v2/send-group-message', [
// body('id').custom((value, { req }) => {
// if (!value && !req.body.name) {
// throw new Error('Invalid value, you can use `id` or `name`');
// }
// return true;
// }),
// body('message').notEmpty(),
// ], async (req, res) => {
// const errors = validationResult(req).formatWith(({
// msg
// }) => {
// return msg;
// });

// if (!errors.isEmpty()) {
// return res.status(422).json({
// status: false,
// message: errors.mapped()
// });
// }

// let chatId = req.body.id;
// const groupName = req.body.name;
// const message = req.body.message;

// // Find the group by name
// // if (!chatId) {
// // const group = await findGroupByName(groupName);
// // if (!group) {
// // return res.status(422).json({
// // status: false,
// // message: 'No group found with name: ' + groupName
// // });
// // }
// chatId = group.id._serialized;
// // }
// conn.sendMessage(chatId, message, MessageType.extendedText).then(response => {
// res.status(200).json({
// status: true,
// response: response
// });
// }).catch(err => {
// res.status(500).json({
// status: false,
// response: err
// });
// });

// let getGroups = await conn.chats;
// let objGroup = { groups: [] };
// let members = getGroups.array;
// for (var key in members) {
// if (members[key].jid.indexOf('@g.us') != -1) {
// objGroup.groups.push({
// id: members[key].jid,
// name: members[key].name
// });
// }
// }
// console.log(objGroup);
// });
//
server.listen(configs.port, () => {
	console.log(`Server listening on 8000`);
});

conn.on('group-participants-update', m => {
	console.log(m);
	var number = m.participants[0];
	var participants = phoneNumberFormatter(number);
	
	const webhook_group = {
		number: participants,
		groupid: m.jid,
		action: m.action
	}
	request({ url: configs.webhook_group, method: "POST", json: webhook_group },
		
	);
})

// webhook
conn.on("message-new", m => {
	console.log(m);
	if (!m.message) return // if there is no text or media message
	
	// ketika pesan masuknya gambar
	if (m.message.imageMessage) {
		console.log('sdfs');
	}
	if (m.hasOwnProperty('participant') == true) {
		var sender = m.key.remoteJid
		} else {
		var sender = phoneNumberFormatter(m.key.remoteJid)
	}
	var chatFromMe = m.key.fromMe;
	var chatId = m.key.remoteJid;
	//	const sender = phoneNumberFormatter(m.key.remoteJid)
	var chatBody = m.message.conversation;
	if ('conversation' in m.message) {
		var type = 'chat';
	}
	var webhook_response = {
		fromMe: chatFromMe,
		data: {
			from: phoneNumberFormatter(chatId),
			body: chatBody
		},
		type: type
	};
	const getBuffer = async (url, options) => {
		try {
			options ? options : {}
			const res = await axios({
				method: "get",
				url,
				...options,
				responseType: 'arraybuffer'
			})
			return res.data
			} catch (e) {
			console.log(`Error : ${e}`)
		}
	}
	request({ url: configs.webhook_url, method: "POST", json: webhook_response },
		function (error, response, body) {
			//	console.log(response)
			if (!error && response.statusCode == 200) {
				// process hook
				if (response.body == null) {
					return 'gagal send webhook';
				}
				const res = response.body;
				if (res.type == 'message') {
					if (res.data.mode == 'chat') {
						conn.sendMessage(sender, res.data.pesan, MessageType.text)
						} else if (res.data.mode == 'reply') {
						conn.sendMessage(sender, res.data.pesan, MessageType.extendedText, { quoted: m })
					}
					} else if (res.type == 'picture') {
					const url = res.data.url;
					const caption = res.data.caption;
					var messageOptions = {};
					const buffer = getBuffer(url);
					if (caption != '') messageOptions.caption = caption;
					conn.sendMessage(sender, buffer, MessageType.image, messageOptions);
					
				} 	//
			} else { console.log('error'); }
		}
	);
	//	await conn.chatRead(m.key.remoteJid);
});