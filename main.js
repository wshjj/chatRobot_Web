// 导入百度语音sdk模块
let AipSpeech = require("baidu-aip-sdk").speech
// 导入http模块
let http = require('http')
// 导入https模块
let https = require("https")
// 导入文件模块
let fs = require('fs')
// 导入路径模块
let path = require('path')
// 导入url模块（用来解析get请求参数）
let url = require('url')
// 导入querystring模块（用来解析post请求参数）
let querystring = require('querystring')
// 导入读取文件信息的模块
let load = require('audio-loader')

// 务必替换百度云控制台中新建百度语音应用的 Api Key 和 Secret Key
let client = new AipSpeech(0, 'GKw5ILGbty0SVGMUmlG4wRrQ', 'f3aLLMqAt4y18yXUNrXZ7bZsFIPVh7dL')

//设置证书路径
const options = {
  key : fs.readFileSync("Nginx/2_www.njitxiaoyuantong.com.key"),
  cert: fs.readFileSync("Nginx/1_www.njitxiaoyuantong.com_bundle.crt")
}

//启动服务器
let serve = https.createServer(options)

serve.on('request',function(req,res){
	console.log("接到请求",req.url)
	if (req.url === '/'){
		fs.readFile(path.join(__dirname,'index.html'),function (err,data) {
            //响应写入文件
            res.end(data);
       })
	}
	else if (req.url.indexOf('/node') === 0 && req.method === 'POST'){
		let postData = ''
		req.on('data',function(chuck){
            postData += chuck
        })
		req.on('end', function () {
//          console.log(postData)
            let postObjc = JSON.parse(postData)
            let audiofile = postObjc.data
//          console.log(audiofile)
            var dataBuffer = new Buffer(audiofile, 'base64')
            fs.writeFile("myword.wav", dataBuffer, (err) => {
				if (err) throw err
					console.log('文件已保存')
					let voice = fs.readFileSync('myword.wav')
					let voiceBase64 = new Buffer(voice)
					client.recognize(dataBuffer, 'wav', 16000).then(function(result) {
					    //console.log('语音识别本地音频文件结果: ' + JSON.stringify(result))
					    if(result.err_no == 0){
					    	console.log("结果："+result.result[0])
						    res.write(result.result[0])
						    res.end()
					    }
					    else if(result.err_no == 3301){
					    	res.write("未听清")
					    	res.end()
					    }
					    else{
					    	res.write("wrong")
					    	res.end()
					    }
					}, function(err) {
					    console.log(err);
					})
			})
        })
	}
	else if (req.url.indexOf('/robot') === 0 && req.method === 'POST'){
		let postData = ''
		req.on('data',function(chuck){
            postData += chuck
        })
		req.on('end', function () {
			let postObjc = JSON.parse(postData)
            let message = postObjc.data
            //发送给图灵机器人的数据
            const robotData = {
				"reqType":0,
				"perception": {
					"inputText": {
						"text": message
					}
				},
				"userInfo": {
					"apiKey": "2067a25076a7490c9bb3fbf64461c84a",
					"userId": "7150c3f2dba5b188"
				}
			}
            //将数据转换为字符串
            let content=JSON.stringify(robotData)
            //发送post请求的数据
            const options = {
				hostname: 'openapi.tuling123.com',
				path: '/openapi/api/v2',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(content)
				}
			}
            //发送post请求
            const request = http.request(options, (result) => {
				result.setEncoding('utf8')
				result.on('data', (chunk) => {
					let resData = JSON.parse(chunk)
					let resAnswer = resData.results[0].values.text
					console.log(resAnswer)
					res.write(resAnswer)
					res.end()
				})
				result.on('end', () => {
//					console.log('响应中已无数据');
				})
			})
            request.on('error', (e) => {
				console.error(`请求遇到问题: ${e.message}`)
			})
            // 将数据写入请求主体。
			request.write(content)
			request.end()
		})
	}
	else if (req.url.indexOf('/compound') === 0 && req.method === 'POST'){
		let postData = ''
		req.on('data',function(chuck){
            postData += chuck
        })
		req.on('end', function () {
			let postObjc = JSON.parse(postData)
            let robotAnswer = postObjc.data
            client.text2audio(robotAnswer, {spd: 5, per: 4}).then(function(result) {
				if (result.data) {
//					console.log('语音合成成功，文件保存到tts.mp3，打开听听吧')
					fs.writeFileSync('tts.mp3', result.data)
					let base64Data = new Buffer(result.data).toString('base64')
					res.write(base64Data)
					res.end()
				} else {
					// 合成服务发生错误
					console.log('语音合成失败: ' + JSON.stringify(result))
				}
			}, function(err) {
				console.log(err)
			})
		})
	}
	else{
		fs.readFile(path.join(__dirname,req.url), function (err,data) {
            //写入文件
            res.end(data);
        })
	}
})

serve.listen(3000,function(){
	console.log("启动服务器成功")
})




// 识别本地语音文件
/* client.recognize(voiceBase64, 'pcm', 16000).then(function(result) {
    console.log('语音识别本地音频文件结果: ' + JSON.stringify(result));
}, function(err) {
    console.log(err);
}) */

// 识别远程语音文件
//client.recognizeByUrl('http://bos.nj.bpc.baidu.com/v1/audio/8k.amr', 'http://yq01-ecom-holmes22-20150818112825.yq01.baidu.com:8492/aip/dump', 'amr', 8000).then(function(result) {
//  console.log('语音识别远程音频文件结果: ' + JSON.stringify(result));
//}, function(err) {
//  console.log(err);
//});

// 语音合成，保存到本地文件
/* client.text2audio('深入浅出', {spd: 0, per: 4}).then(function(result) {
    if (result.data) {
        console.log('语音合成成功，文件保存到tts.mp3，打开听听吧');
        fs.writeFileSync('tts.mp3', result.data);
    } else {
        // 合成服务发生错误
        console.log('语音合成失败: ' + JSON.stringify(result));
    }
}, function(err) {
    console.log(err);
}); */

