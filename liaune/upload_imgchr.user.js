// ==UserScript==
// @name         upload_imgchr
// @namespace    https://github.com/Liaune/scripts/tree/master/liaune
// @version      0.1
// @description  imgchr.com图片上传插件
// @author       liaune
// @include      *.*
// @grant        none
// ==/UserScript==

(function() {
    var script = document.createElement('script');
	script.setAttribute('type','text/javascript');
	script.setAttribute('src','https://imgchr.com/sdk/pup.js');
	document.getElementsByTagName('head')[0].appendChild(script);
})();
