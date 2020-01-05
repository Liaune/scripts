// ==UserScript==
// @name         TinyGrail AutoOrder
// @namespace    https://github.com/bangumi/scripts/tree/master/liaune
// @version      1.0.1
// @description  小圣杯自动挂单
// @author       Liaune
// @include     /^https?://(bgm\.tv|bangumi\.tv|chii\.in)/(user|character|rakuen\/topic\/crt).*
// @grant        GM_addStyle
// ==/UserScript==
let api = 'https://tinygrail.com/api/';

function getData(url, callback) {
	if (!url.startsWith('http'))
		url = api + url;
	$.ajax({
		url: url,
		type: 'GET',
		xhrFields: { withCredentials: true },
		success: callback
	});
}
function postData(url, data, callback) {
	let d = JSON.stringify(data);
	if (!url.startsWith('http'))
		url = api + url;
	$.ajax({
		url: url,
		type: 'POST',
		contentType: 'application/json',
		data: d,
		xhrFields: { withCredentials: true },
		success: callback
	});
}

let orderList = JSON.parse(localStorage.getItem('TinyGrail_orderList')) || [];

async function retryPromise(callback, n=10) {
	let error;
	while(n--) {
		try {
			return await new Promise(callback);
		} catch (err) {
			error = err;
			await new Promise(resolve => setTimeout(resolve, 300)); // sleep 300 ms
		}
	}
	throw error;
};

async function autoOrder(charas){
	closeDialog();
	var dialog = `<div id="TB_overlay" class="TB_overlayBG TB_overlayActive"></div>
<div id="TB_window" class="dialog" style="display:block;max-width:640px;min-width:400px;">
<div class="info_box">
<div class="title">自动挂单检测中</div>
<div class="result" style="max-height:500px;overflow:auto;"></div>
</div>
<a id="TB_closeWindowButton" title="Close">X关闭</a>
</div>
</div>`;
	$('body').append(dialog);
	$('#TB_closeWindowButton').on('click', closeDialog);
	$('#TB_overlay').on('click', closeDialog);
	for (let i = 0; i < charas.length; i++) {
		$('.info_box .title').text(`自动挂单检测中 ${i+1} / ${charas.length}`);
		let charaId = charas[i].charaId;
		if(!charas[i].lowAskPrice) charas[i].lowAskPrice = 9999; //未设置卖出下限
        if(!charas[i].target) charas[i].target = 99999; //未设置目标股数
		if(!charas[i].increase) charas[i].increase = 0.5; //未设置每次递增
		$('.info_box .result').prepend(`<div class="row">check #${charaId} ${charas[i].name}</div>`);
		await retryPromise(resolve => getData(`chara/user/${charaId}`, function (d, s) {
			let Bids = d.Value.Bids;
			let Amount = d.Value.Amount;
			let myBidPrice = d.Value.Bids[0] ? d.Value.Bids[0].Price : 0;
			let myBidAmount = d.Value.Bids[0] ? d.Value.Bids[0].Amount : 0;
			let increase = charas[i].increase - 0.001;
            let amount = Math.min(charas[i].target - Amount,charas[i].amount);
			function cancelBid(type){ //取消当前买单
				let tid = Bids[0] ? Bids[0].Id : null;
				if(tid){ postData(`chara/bid/cancel/${tid}`, null, function(d, s) {
					console.log(`${type}: 取消买单#${charaId} ${myBidPrice}*${myBidAmount}`);
					$('.info_box .result').prepend(`<div class="row">${type}: 取消买单 #${charaId} ${charas[i].name} ${myBidPrice}*${myBidAmount}</div>`);
				});}
			}
            function postBid(price, amount, type){
                postData(`chara/bid/${charaId}/${price}/${amount}`, null, function(d, s) {
                    if(d.Message){
                        console.log(`${type}: ${charaId} ${d.Message}`);
                        $('.info_box .result').prepend(`<div class="row">${type}: #${charaId} ${charas[i].name} ${d.Message}</div>`);
                    }
                    else{
                        console.log(`${type}: 买入委托#${charaId} ${price}*${amount}`);
                        $('.info_box .result').prepend(`<div class="row">${type}: 买入委托 #${charaId} ${charas[i].name} ${price}*${amount}</div>`);
                    }
                });
            }
            function postAsk(price, amount, type){
                postData(`chara/ask/${charaId}/${price}/${amount}`, null, function(d, s) {
                    if(d.Message){
                        console.log(`${type}: ${charaId} ${d.Message}`);
                        $('.info_box .result').prepend(`<div class="row">${type}: #${charaId} ${charas[i].name} ${d.Message}</div>`);
                    }
                    else{
                        console.log(`${type}: 卖出委托#${charaId} ${price}*${amount}`);
                        $('.info_box .result').prepend(`<div class="row">${type}: 卖出委托 #${charaId} ${charas[i].name} ${price}*${amount}</div>`);
                    }
                });
            }
			function formatPrice(price){
                return (price - Math.round(price))>=0 ? Math.round(price) : Math.round(price)-0.5;
            }
            if(Amount >= charas[i].target){
                orderList.splice(i,1);
                localStorage.setItem('TinyGrail_orderList',JSON.stringify(orderList));
                cancelBid(`reach target`);
                resolve();
            }
			else getData(`chara/depth/${charaId}`,function (d, s) {
				let AskPrice = d.Value.Asks[0] ? d.Value.Asks[0].Price : 0;
				let AskAmount = d.Value.Asks[0] ? d.Value.Asks[0].Amount : 0;
				let BidPrice = d.Value.Bids[0] ? d.Value.Bids[0].Price : 0;
				let BidAmount = d.Value.Bids[0] ? d.Value.Bids[0].Amount : 0;
				let BidPrice1 = d.Value.Bids[1] ? d.Value.Bids[1].Price : 0;
				let BidPrice2 = d.Value.Bids[2] ? d.Value.Bids[2].Price : 0;
				if(AskPrice && AskPrice <= charas[i].highBidPrice){ //最低卖单低于买入上限，买入
					postBid(AskPrice, AskAmount, 'case0');
				}
				if (BidPrice > myBidPrice) { //买一价格高于我的买价
					if(BidPrice <= charas[i].highBidPrice){ //买一价格低于买入上限，加价0.999
						cancelBid('case1.1');
						let price = Math.max(Math.min(BidPrice+increase,charas[i].highBidPrice),charas[i].lowBidPrice);
						postBid(price, amount, 'case1.1');
					}
					else if(BidAmount < 50){ //买一价格高于买入上限，且数量小于50，以买二价格挂单
						if(!myBidPrice){ //尚未挂单，以买二价格挂单
							let price = Math.max(BidPrice1+increase,charas[i].lowBidPrice);
                            if(price <= charas[i].highBidPrice){
                               postBid(price, amount, 'case1.2.1');
                            }
						}
						else if(myBidPrice != BidPrice1+increase){ //挂单价格不是买二，取消挂单，以买二价格挂单
							let price = Math.min(charas[i].highBidPrice,Math.max(BidPrice1+increase,charas[i].lowBidPrice));
                            if(BidPrice1 > charas[i].highBidPrice){ //买二价格也高于买入上限，取消挂单
                                cancelBid('case1.2.2.1');
                            }
							else if(myBidPrice != price){
								cancelBid('case1.2.2.2');
								postBid(price, amount, 'case1.2.2.2');
							}
						}
                        else{ //挂单价格不合理，取消挂单，以合理价格挂单
							let price1 = Math.min(charas[i].highBidPrice,Math.max(BidPrice1+increase,charas[i].lowBidPrice));
							let price = Math.min(charas[i].highBidPrice,Math.max(BidPrice2+increase,charas[i].lowBidPrice));
							if(myBidPrice!=price1){
								cancelBid('case1.2.3.1');
								postBid(price, amount, 'case1.2.3.1');
							}
							else if(myBidAmount > amount){ //超出数量
								cancelBid('case1.2.3.2');
								postBid(price, amount, 'case1.2.3.2');
							}
						}
					}
					else{ //买一价格高于买入上限，且数量大于50，取消挂单
						if(myBidPrice){
							cancelBid('case1.3');
						}
					}
					if(BidPrice >= charas[i].lowAskPrice){ //买一价格高于卖出下限，将已有股份卖给买一
						let amount = Math.min(Amount,BidAmount);
						if(amount){
							postAsk(BidPrice, amount, 'case1.4');
						}
					}
				}
				else{//自己的买单为买一
					let price = Math.max(BidPrice1+increase,charas[i].lowBidPrice);
					if(BidAmount > myBidAmount){ //有竞争
						if(myBidAmount < Math.min(amount, Math.max(amount*0.5,50))){ //需要补单
							let price = Math.max(Math.min(BidPrice+increase,charas[i].highBidPrice),charas[i].lowBidPrice);
							cancelBid('case2.1.1');
							postBid(price, amount, 'case2.1.1');
						}
						else if(myBidPrice < charas[i].lowBidPrice){ //价格太低
							cancelBid('case2.1.2');
							postBid(price, amount, 'case2.1.2');
						}
					}
					else if(formatPrice(myBidPrice) != formatPrice(price) || !myBidPrice){ //无竞争，需要调整价格,或未出价
						cancelBid('case2.2');
						postBid(price, amount, 'case2.2');
					}
                    else{
						let price = myBidPrice;
                        if(myBidAmount < Math.min(amount, Math.max(amount*0.8,80))){ //需要补单
							cancelBid('case2.3');
							postBid(price, amount, 'case2.3');
						}
						else if(myBidAmount > amount){ //超出数量
							cancelBid('case2.4');
							postBid(price, amount, 'case2.4');
						}
                    }
				}
				resolve();
				if(i == charas.length-1){
					$('.info_box .title').text(`自动挂单检测完毕！ ${i+1} / ${charas.length}`);
					//setTimeout(location.reload(), 10*1000);
				}
			});
		}));
	}
}

function closeDialog() {
	$('#TB_overlay').remove();
	$('#TB_window').remove();
}

function cancelOrder(charaId,index){
	orderList.splice(index,1);
	localStorage.setItem('TinyGrail_orderList',JSON.stringify(orderList));

	getData(`chara/user/${charaId}`, function (d, s) {
		let Bids = d.Value.Bids;
		let tid = Bids[0] ? Bids[0].Id : null;
		if(tid){
            postData(`chara/bid/cancel/${tid}`, null, function(d, s) {
                console.log(`取消买单#${charaId} ${myBidPrice}*${myBidAmount}`);
                location.reload();
            });
        }
        location.reload();
	});
}

function openOrderDialog(chara){
	let highBidPrice = 10, lowBidPrice = 10, amount = 100, target = 5000, lowAskPrice = 9999, increase = 0.5;
	let inorder = false, index = 0;
	for(let i = 0; i < orderList.length; i++){
		if(orderList[i].charaId == chara.Id){
			highBidPrice = orderList[i].highBidPrice;
			lowBidPrice = orderList[i].lowBidPrice;
			amount = orderList[i].amount;
            target = orderList[i].target;
			lowAskPrice = orderList[i].lowAskPrice;
			increase = orderList[i].increase;
			inorder = true;
			index = i;
		}
	}
	let dialog = `<div id="TB_overlay" class="TB_overlayBG TB_overlayActive"></div>
<div id="TB_window" class="dialog" style="display:block;">
<div class="title" title="买入上限 / 买入下限 / 挂单数量 / 目标数量 / 卖出下限 / 每次递增">
自动挂单 - #${chara.Id} 「${chara.Name}」 ₵${highBidPrice} / ₵${lowBidPrice} / ${amount} / ${target} / ₵${lowAskPrice}/ ₵${increase}</div>
<div class="desc">输入买入上限 / 买入下限 / 挂单数量 / 目标数量 / 卖出下限 / 每次递增</div>
<div class="label"><div class="trade order">
<input class="highBidPrice" type="number" style="width:75px" title="买入上限" value="${highBidPrice}">
<input class="lowBidPrice" type="number" style="width:75px" title="买入下限" value="${lowBidPrice}">
<input class="amount" type="number" style="width:75px" title="挂单数量" value="${amount}">
<input class="target" type="number" style="width:75px" title="目标数量" value="${target}">
<input class="lowAskPrice" type="number" style="width:75px" title="卖出下限" value="${lowAskPrice}">
<input class="increase" type="number" style="width:75px" title="每次递增" value="${increase}">
<button id="startOrderButton" class="active">自动挂单</button><button id="cancelOrderButton">取消挂单</button></div>
<div class="loading" style="display:none"></div>
<a id="TB_closeWindowButton" title="Close">X关闭</a>
</div>`;
	$('body').append(dialog);

	$('#TB_closeWindowButton').on('click', closeDialog);

	$('#cancelOrderButton').on('click', function(){
		if(inorder){
			alert(`取消自动挂单${chara.Name}`);
			cancelOrder(chara.Id,index);
		}
		closeDialog();
	});

	$('#startOrderButton').on('click', function () {
		let info = {};
		info.charaId = chara.Id.toString();
		info.name = chara.Name;
		info.highBidPrice = $('.trade.order .highBidPrice').val();
		info.lowBidPrice = $('.trade.order .lowBidPrice').val();
		info.amount = $('.trade.order .amount').val();
        info.target = $('.trade.order .target').val();
		info.lowAskPrice =  $('.trade.order .lowAskPrice').val();
		info.increase =  $('.trade.order .increase').val();
		console.log(info);
		if(inorder){
			orderList.splice(index,1);
			orderList.unshift(info);
			localStorage.setItem('TinyGrail_orderList',JSON.stringify(orderList));
		}
		else orderList.unshift(info);
		console.log(orderList);
		localStorage.setItem('TinyGrail_orderList',JSON.stringify(orderList));
		alert(`启动自动挂单#${chara.Id} ${chara.Name}`);
		closeDialog();
		autoOrder(orderList);
	});
}

function setOrder(charaId){
	let charas = [];
	for(let i = 0; i < orderList.length; i++){
		charas.push(orderList[i].charaId);
	}
	let button;
	if(charas.includes(charaId)){
		button = `<button id="autoOrderButton" class="text_button">[自动挂单中]</button>`;
	}
	else{
		button = `<button id="autoOrderButton" class="text_button">[自动挂单]</button>`;
	}
	$('#kChartButton').before(button);

	$('#autoOrderButton').on('click', () => {
		getData(`chara/${charaId}`, (d) => {
			let chara = d.Value;
			openOrderDialog(chara);
		});
	});
}

let times = 1;
setInterval(function(){
	console.log('第'+times+'次挂单检测');
	autoOrder(orderList);
	times++;
},10*60*1000);

function observeChara(mutationList) {
	if(!$('#grailBox .progress_bar, #grailBox .title').length) {
		fetched = false;
		return;
	}
	if(fetched) return;
	if($('#grailBox .title').length) {
		fetched = true;
		let charaId = $('#grailBox .title .name a')[0].href.split('/').pop();
		setOrder(charaId);
	} // use '.progress_bar' to detect (and skip) ICO characters
	else if($('#grailBox .progress_bar').length) {
		observer.disconnect();
	}
}
let fetched = false;
let parentNode=null, observer;
if(location.pathname.startsWith('/rakuen/topic/crt')) {
	parentNode = document.getElementById('subject_info');
	observer = new MutationObserver(observeChara);
} else if(location.pathname.startsWith('/character')) {
	parentNode = document.getElementById('columnCrtB')
	observer = new MutationObserver(observeChara);
}
if(parentNode) observer.observe(parentNode, {'childList': true, 'subtree': true});


















