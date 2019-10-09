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
	$('body').append(`<script async id="chevereto-pup-src" src="https://imgchr.com/sdk/pup.js" data-url="https://imgchr.com/upload" data-auto-insert="bbcode-embed-medium"></script>`);
})();
