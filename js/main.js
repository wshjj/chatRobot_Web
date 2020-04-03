jQuery(function(){
//	计算屏高和屏宽
	let widthY = document.body.clientWidth
	let widthX = document.body.clientHeight
//	调整对话框宽度
	jQuery(".content_right").css("width",(widthY-150)+"px")
	jQuery(".content_left").css("width",(widthY-150)+"px")
//	计算确定头部文字行高
	jQuery("#back").css("line-height",(widthX*0.07)+"px")
	jQuery("#title").css("line-height",(widthX*0.07)+"px")
	
//	新的录音对象
	let recorder

//	底部语音/文字切换等Vue的功能
	let bottom = new Vue({
		el: '#wrap',
		data: {
			btn: true,
			myMessage: [],
			myVoice: [],
			robotMessage: [],
			robotVoice: [],
			nowMessage: "",
		},
		
		methods: {
//			切换语音输入和打字输入方式
			changeWay: function(){
				let that = this
				this.btn = !this.btn
				this.$nextTick(function () {
                    if(!this.btn){
                    	document.getElementById("send").style.display = "none"
                    	let recording
                    	let recordingCount = 0
                    	//“录音中”的特效函数
                    	function changeFlash(){
                    		if(recordingCount == 3)recordingCount = 0
								recordingCount++
								let recordingWord = document.getElementById("recording")
								switch(recordingCount){
									case 1 : recordingWord.innerText = "录音中。";break;
									case 2 : recordingWord.innerText = "录音中。。";break;
									case 3 : recordingWord.innerText = "录音中。。。";break;
								}
                    	}
                    	function startFlash(){
                    		recording = setInterval(changeFlash,400)
                    	}
                    	function endFlash(){
                    		clearInterval(recording)
                    	}
						let record = document.getElementById("record")
						//按下开始录音
						record.addEventListener("touchstart",function(e){
							e.preventDefault()
							//	创建新的录音对象
							recorder = new Recorder({
							    sampleBits: 16,
							    sampleRate: 16000,
							    numChannels: 1,
							    compiling: false,
							})
							document.getElementById("recording").style.display = "block"
							//开始录音
							recorder.start().then(()=>{console.log("开始录音");startFlash()},(err)=>{console.log(err)})
						})
						//松开结束录音
						record.addEventListener("touchend",function(e){
							e.preventDefault()
							document.getElementById("recording").style.display = "none"
							//录音中的特效效果关闭
							endFlash()
							layer.open({
								type: 2 ,
								content: '语音处理中',
								shadeClose: false,
							})
							recorder.stop()
							//获取blob音频文件
							let blob = recorder.getWAVBlob()
//							let blob = recorder.getPCMBlob()
							console.log(blob)
							//读取音频时长
							let audioLen = Math.round(recorder.duration)
							//将blob转化成可供播放的src地址
							let src = URL.createObjectURL(blob)
							//获取当前时间
							let nowTime = getTime()
							//定义语音消息的id
							let id = "play"+that.myVoice.length
							let audioId = "audio"+that.myVoice.length
							that.myVoice.push(src)
							//请求语音识别的接口
							blobToDataURI(blob, function (data) {
								let sendData = data.replace(/^data:audio\/\w+;base64,/,"");
								let jsonData = {
									"data" : sendData
								}
								//发送post请求
								$.ajax({
									type: "POST",
									url: "/node",
									timeout: 8000,
									data:JSON.stringify(jsonData),
									contentType : "application/json", 
									success: function(res){
										console.log(res)
										layer.closeAll()
										if(res == "未听清"){
											layer.open({
												content: '未听清，请重新说一遍。',
												btn: '好的',
												shadeClose: false,
											})
										}
										else if(res == "wrong"){
											layer.open({
												content: '请求失败，请检查网络连接，且注意语音时间不要过长，若检查无误，可能是服务端出错，请稍候再试',
												btn: '好的',
												shadeClose: false,
											})
										}
										else{
											//插入语音消息
											let control = addNewVoice(true,nowTime,res,id,audioLen)
											//创建音频(视觉效果)
											let audio = document.createElement('audio')
											audio.src = src
											audio.controls = false
											audio.id = audioId
											control.appendChild(audio)
											control.addEventListener("click",function(){
												document.getElementById(audioId).play()
											})
											let robotAnswer = answer(res,function(data){
												let comData = {
													"data": data
												}
												$.ajax({
													type: "POST",
													url: "/compound",
													data:JSON.stringify(comData),
													contentType : "application/json",
													success: function(res){
//														console.log(res)
														let blob = dataURItoBlob("data:audio/mp3;base64,"+res)
														console.log(blob)
														let nowTime = getTime()
														let src = URL.createObjectURL(blob)
														let audio = document.createElement('audio')
														audio.src = src
														audio.controls = false
														audio.id = audioId+"0"
														let audioLen
														let getAudioLen = setInterval(function(){
															if(!isNaN(audio.duration)){
																audioLen = Math.round(audio.duration)
																console.log(audioLen)
																clearInterval(getAudioLen)
																//插入机器人语音消息
																let control = addNewVoice(false,nowTime,data,id+"0",audioLen)
																//创建机器人音频(视觉效果)
																control.appendChild(audio)
																control.addEventListener("click",function(){
																	document.getElementById(audio.id).play()
																})
															}
														},10)
													}
												})
											})
										}
										//销毁录音的音频实例
										recorder.destroy().then(function() {
										    recorder = null
										})
									},
									complete: function(XMLHttpRequest,status){
										if(status == 'timeout'){
											ajaxTimeoutTest.abort()
											layer.closeAll()
											layer.open({
												content: '请求超时，请重新再试一次。',
												btn: '好的',
												shadeClose: false,
											})
										}
									}
								})
							})
						})
					}
                    else{
                    	document.getElementById("send").style.display = "flex"
                    }
                })
			},
//			发送消息
			send: function(){
				let nowTime = getTime()
		        addNewMessage(true,nowTime,this.nowMessage)
				this.myMessage.push(this.nowMessage)
				let robotAnswer = answer(this.nowMessage,function(data){
					let nowTime = getTime()
					addNewMessage(false,nowTime,data)
				})
				this.nowMessage = ""
//				console.log(this.myMessage)
			}
		},
	})

//函数功能:blob转化为base64
	function blobToDataURI(blob, callback) {
        let reader = new FileReader();
        reader.onload = function (e) {
            callback(e.target.result);
        }
        reader.readAsDataURL(blob);
    }

//函数功能：base64转换为blob
	function dataURItoBlob(dataURI) {
        let mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]; // mime类型
        let byteString = atob(dataURI.split(',')[1]); //base64 解码
        let arrayBuffer = new ArrayBuffer(byteString.length); //创建缓冲数组
        let intArray = new Uint8Array(arrayBuffer); //创建视图

        for (let i = 0; i < byteString.length; i++) {
            intArray[i] = byteString.charCodeAt(i);
        }
        return new Blob([intArray], {type: mimeString});
    }

//函数功能：请求图灵机器人
	function answer(message,callback){
		let askQuestion = {
			data: message
		}
		$.ajax({
			type: "POST",
			url: "/robot",
			data:JSON.stringify(askQuestion),
			contentType : "application/json",
			success: function(res){
//				console.log(res)
				callback(res)
			}
		})
	}

//	函数功能：生成一条消息
//	myself 根据是否是自己发的消息确定消息格式,靠左还是靠右
//	time 是消息发送时间
//	word 是消息内容
	function addNewMessage(myself,time,word){
		if(myself){
			let head = "img/head.png"
			let newMessage = '<div class="message"><div class="time">'+time+'</div><div class="chat"><div class="head_right"><img class="img_right" src="'+head+'"/></div><div class="content_right">'+word+'</div></div></div>'
			jQuery("#content").append(newMessage)
		}
		else{
			let head = "img/robot.png"
			let newMessage = '<div class="message"><div class="time">'+time+'</div><div class="chat"><div class="head_left"><img class="img_left" src="'+head+'"/></div><div class="content_left">'+word+'</div></div></div>'
			jQuery("#content").append(newMessage)
		}
		//计算调整消息框宽度
		let widthY = document.body.clientWidth
		jQuery(".content_right").css("width",(widthY-150)+"px")
		jQuery(".content_left").css("width",(widthY-150)+"px")
		//滚动到底部
		content.scrollTo(0,document.getElementById("content").scrollHeight)
	}
	
//	函数功能：生成一条语音
//	myself 根据是否是自己发的消息确定消息格式,靠左还是靠右
//	time 是消息发送时间
//	word 是消息内容
//	id 是音频控件的id
	function addNewVoice(myself,time,word,id,audioLen){
		if(myself){
			let head = "img/head.png"
			let newVoice = '<div class="message"><div class="time">'+time+'</div><div class="chat"><div class="head_right"><img class="img_right" src="'+head+'"/></div><div class="content_right" id="'+id+'"><p><i class="iconfont">&#xe667;</i> '+audioLen+"'"+'</p><hr /><p>'+word+'</p></div></div></div>'
			jQuery("#content").append(newVoice)
		}
		else{
			let head = "img/robot.png"
			let newVoice = '<div class="message"><div class="time">'+time+'</div><div class="chat"><div class="head_left"><img class="img_left" src="'+head+'"/></div><div class="content_left" id="'+id+'"><p><i class="iconfont">&#xe667;</i> '+audioLen+"'"+'</p><hr /><p>'+word+'</p></div></div></div>'
			jQuery("#content").append(newVoice)
		}
		//计算调整消息框宽度
		let widthY = document.body.clientWidth
		jQuery(".content_right").css("width",(widthY-150)+"px")
		jQuery(".content_left").css("width",(widthY-150)+"px")
		//滚动到底部
		content.scrollTo(0,document.getElementById("content").scrollHeight)
		return document.getElementById(id)
	}
	
	//函数功能：根据格式生成当前时间
	function getTime(){
		let now = new Date();
	    let year = now.getFullYear(); //得到年份
		let month = now.getMonth()+1;//得到月份
		let date = now.getDate();//得到日期
		let hour = now.getHours();//得到小时
		let minu = now.getMinutes();//得到分钟
		let sec = now.getSeconds();//得到秒
		let nowTime = `${year}-${month}-${date} ${hour}:${minu}:${sec}`
		return nowTime
	}
})