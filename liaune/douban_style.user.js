// ==UserScript==
// @name         douban_style
// @namespace    https://github.com/Liaune/scripts/tree/master/liaune
// @version      0.1
// @description  豆瓣样式
// @author       liaune
// @include      /^https?://(\S+.)douban.com.*
// @grant        none
// ==/UserScript==

(function() {
    const style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.innerHTML = `
.interest_form .comment{
    height: 100px;
}
`;
    $('head').append(style);
})();
