/**
 * @license rat v1.12.4 (rat-1.12.4.js)
 * Copyright (c) @2013-2025 Rakuten, Inc
 * Date : 2025-10-02
 * Env: prod
 * Rev: c213a0f
 */

var RAL = RAL || {};
RAL.callQueue = RAL.callQueue || [];
RAL.callQueue.push(['setMainReceiver', 'secure.rat.rakuten.co.jp']);

var RAT = RAT || {};

(function () {
  "use strict";
  // local JSON polyfill
  var JSON = window.JSON;
  if (!JSON) {
    JSON = {};
    // jshint ignore:start
    JSON.parse=function(a,f){function g(a,b){var d=void 0,e,c=a[b];if(c&&"object"===typeof c)for(d in c)Object.prototype.hasOwnProperty.call(c,d)&&(e=g(c,d),void 0!==e?c[d]=e:delete c[d]);return f.call(a,b,c)}var b;b=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;a=String(a);b.lastIndex=0;b.test(a)&&(a=a.replace(b,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)}));return/^[\],:{}\s]*$/.test(a.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
    "@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,""))?(b=eval("("+a+")"),"function"===typeof f?g({"":b},""):b):null};
    // jshint ignore:end
  }

  var $ = (typeof window.jQuery === 'function') ? jQuery : undefined;

  // Custom Selector
  !function(c){"use strict";var i,o,l,a,s,u,t,n,r,f,h=c.document,d=(h.querySelectorAll||(h.querySelectorAll=h.body.querySelectorAll=Object.querySelectorAll=function(t,e,n,r,i){var o=h,l=o.createStyleSheet();for(i=o.all,e=[],n=(t=t.replace(/\[for\b/gi,"[htmlFor").split(",")).length;n--;){for(l.addRule(t[n],"k:v"),r=i.length;r--;)i[r].currentStyle.k&&e.push(i[r]);l.removeRule(0)}return e}),o=h,l="x-ms-event-listeners",(i=c).addEventListener&&i.removeEventListener||!i.attachEvent||!i.detachEvent||(a=function(t){return"function"==typeof t},s=function(t,e){var n=e[l];if(n)for(var r,i=n.length;i--;)if((r=n[i])[0]===t)return r[1]},u=function(t,e,n){var r=e[l]||(e[l]=[]);return s(t,e)||(r[r.length]=[t,n],n)},t=function(t){var e=o[t];o[t]=function(t){return f(e(t))}},n=function(t,e,n){var r;a(e)&&(r=this).attachEvent("on"+t,u(r,e,function(t){(t=t||i.event).preventDefault=t.preventDefault||function(){t.returnValue=!1},t.stopPropagation=t.stopPropagation||function(){t.cancelBubble=!0},t.target=t.target||t.srcElement||o.documentElement,t.currentTarget=t.currentTarget||r,t.timeStamp=t.timeStamp||(new Date).getTime(),e.call(r,t)}))},r=function(t,e,n){a(e)&&(e=s(this,e))&&this.detachEvent("on"+t,e)},(f=function(t){if(t){var e=t.length;if(e)for(;e--;)t[e].addEventListener=n,t[e].removeEventListener=r;else t.addEventListener=n,t.removeEventListener=r}return t})([o,i]),"Element"in i?((m=i.Element).prototype.addEventListener=n,m.prototype.removeEventListener=r):(o.attachEvent("onreadystatechange",function(){f(o.all)}),t("getElementsByTagName"),t("getElementById"),t("createElement"),f(o.all))),Array.prototype.indexOf||(Array.prototype.indexOf=function(t,e){var n;if(null==this)throw new TypeError('"this" is null or not defined');var r=Object(this),i=r.length>>>0;if(0!=i){e=0|e;if(!(i<=e))for(n=Math.max(0<=e?e:i-Math.abs(e),0);n<i;n++)if(n in r&&r[n]===t)return n}return-1}),Array.prototype.map||(Array.prototype.map=function(t){var e,n,r;if(null==this)throw new TypeError("this is null or not defined");var i,o=Object(this),l=o.length>>>0;if("function"!=typeof t)throw new TypeError(t+" is not a function");for(1<arguments.length&&(e=arguments[1]),n=new Array(l),r=0;r<l;)r in o&&(i=o[r],i=t.call(e,i,r,o),n[r]=i),r++;return n}),Array.prototype.reduce||(Array.prototype.reduce=function(t){if(null===this)throw new TypeError("Array.prototype.reduce called on null or undefined");if("function"!=typeof t)throw new TypeError(t+" is not a function");var e,n=Object(this),r=n.length>>>0,i=0;if(2<=arguments.length)e=arguments[1];else{for(;i<r&&!(i in n);)i++;if(r<=i)throw new TypeError("Reduce of empty array with no initial value");e=n[i++]}for(;i<r;)i in n&&(e=t(e,n[i],i,n)),i++;return e}),"function"!=typeof Array.prototype.forEach&&(Array.prototype.forEach=function(t,e){if("number"==typeof this.length&&"function"==typeof t&&"object"==typeof this)for(var n=0;n<this.length;n++){if(!(n in this))return;t.call(e||this,this[n],n,this)}}),Array.prototype.filter||(Array.prototype.filter=function(t,e){if("Function"!=typeof t&&"function"!=typeof t||!this)throw new TypeError;var n,r=this.length>>>0,i=new Array(r),o=this,l=0,c=-1;if(e===undefined)for(;++c!=r;)c in this&&(n=o[c],t(o[c],c,o)&&(i[l++]=n));else for(;++c!=r;)c in this&&(n=o[c],t.call(e,o[c],c,o)&&(i[l++]=n));return i.length=l,i}),Array.prototype.slice);try{d.call(h.documentElement)}catch(E){Array.prototype.slice=function(t,e){var n,r=this.length,i=[];if(this.charAt)for(n=0;n<r;n++)i.push(this.charAt(n));else for(n=0;n<this.length;n++)i.push(this[n]);return d.call(i,t,e||i.length)}}var p=function(t,e){return this instanceof p?t instanceof p?t:"object"==typeof(t=(t="string"==typeof t?this.select(t,e):t)&&t.nodeName?[t]:t)&&(null!=t&&t===t.window||1===t.nodeType)?(this.nodes=[t],this):(this.nodes=this.slice(t),void(this.length=this.nodes.length)):new p(t,e)},y=(p.prototype.nodes=[],p.prototype.length=0,p.prototype);function e(t){var e=h.createElement("div");try{return!!t(e)}catch(n){return!1}finally{e.parentNode&&e.parentNode.removeChild(e)}}(p.fn=y).support={attributes:e(function(t){return t.className="i",!t.getAttribute("className")}),getComputedStyle:e(function(){return"function"==typeof c.getComputedStyle}),reliableHiddenOffsets:e(function(t){return t.style.display="none",(reliableHiddenOffsetsVal=0===t.getClientRects().length)&&(t.style.display="",t.innerHTML="<table><tr><td></td><td>t</td></tr></table>",t.childNodes[0].style.borderCollapse="separate",(contents=t.getElementsByTagName("td"))[0].style.cssText="margin:0;border:0;padding:0;display:none",(reliableHiddenOffsetsVal=0===contents[0].offsetHeight)&&(contents[0].style.display="",contents[1].style.display="none",reliableHiddenOffsetsVal=0===contents[0].offsetHeight)),reliableHiddenOffsetsVal})},p.support=y.support,y.args=function(t,e,n){return(t="string"!=typeof(t="function"==typeof t?t(e,n):t)?this.slice(t).map(this.str(e,n)):t).toString().split(/[\s,]+/).filter(function(t){return t.length})},y.array=function(i){return this.nodes.reduce(function(t,e,n){var r;return i?(r="string"==typeof(r=(r=i.call(e,e,n))||!1)?p(r):r)instanceof p&&(r=r.nodes):r=e.innerHTML,t.concat(!1!==r?r:[])},[])},y.attr=function(t,e,r){r=r?"data-":"";var i=this;return this.pairs(t,e,function(t,e){return i.support.attributes?t.getAttribute(r+e):(e=t.getAttributeNode(r+e))&&e.specified?e.value:null},function(t,e,n){i.support.attributes?t.setAttribute(r+e,n):t[r+e]=n})},y.appear=function(h,t){var d={once:"boolean"!=typeof(t=t||{}).once||t.once,ratio:t.ratio||0,threshold:t.threshold||50};return this.each(function(){var t,e,n,r,i,o,l,c,a,s,u,f;h&&(t=p(this),e=p(b(this.ownerDocument)),n=this,i=function(){!function(t,e,n){var r,i,o,l,c,a,s;if(t.visible())return i=(r=e.scrollLeft())+e.width(),e=(o=e.scrollTop())+e.height(),c=(l=(a=t.offset()).left)+t.width(),s=(a=a.top)+t.height(),n=!isNaN(n)&&0<n&&n<=1?n:0,Math.max(1,n*t.width()*t.height())<=Math.max(0,Math.min(i,c)-Math.max(r,l))*Math.max(0,Math.min(e,s)-Math.max(o,a))}(t,e,d.ratio)||(d.once&&e.off("scroll",r),h.apply(n,arguments))},o=d.threshold,s=null,u=0,f=function(){u=Date.now?Date.now():(new Date).valueOf(),s=null,a=i.apply(l,c),s||(l=c=null)},r=function(){var t=Date.now?Date.now():(new Date).valueOf(),e=o-(t-(u=u||t));return l=this,c=arguments,e<=0||o<e?(s&&(clearTimeout(s),s=null),u=t,a=i.apply(l,c),s||(l=c=null)):s=s||setTimeout(f,e),a},e.on("scroll",r),r())})},y.children=function(t){var e=this;return this.map(function(t){return e.slice(t.children)}).filter(t)};var m=/^[^{]+\{\s*\[native \w/;function g(t){switch(t){case"thin":return"2px";case"medium":return"4px";case"thick":return"6px";default:return t}}function v(t){if(!t)return{height:undefined,width:undefined};if(t==c&&t.window==c){if("number"==typeof c.innerHeight)return{height:c.innerHeight,width:c.innerWidth};if(h.documentElement&&(h.documentElement.clientWidth||h.documentElement.clientHeight))return{height:h.documentElement.clientHeight,width:h.documentElement.clientWidth};if(h.body&&(h.body.clientWidth||h.body.clientHeight))return{height:h.body.clientHeight,width:h.body.clientWidth}}var e,n,r,i,o,l;return t==h&&9===t.nodeType?{height:Math.max(h.body.scrollHeight,h.body.offsetHeight,h.documentElement.clientHeight,h.documentElement.scrollHeight,h.documentElement.offsetHeight),width:Math.max(h.body.scrollWidth,h.body.offsetWidth,h.documentElement.clientWidth,h.documentElement.scrollWidth,h.documentElement.offsetWidth)}:(e=y.support.getComputedStyle?c.getComputedStyle(t,null):t.currentStyle,n=t.offsetHeight,t=t.offsetWidth,r=parseFloat(g(e.borderTopWidth)),i=parseFloat(g(e.borderBottomWidth)),o=parseFloat(g(e.borderLeftWidth)),l=parseFloat(g(e.borderRightWidth)),{height:n-i-r-parseFloat(e.paddingTop)-parseFloat(e.paddingBottom),width:t-o-l-parseFloat(e.paddingLeft)-parseFloat(e.paddingRight)})}function b(t){return null!==t&&t==t.window?t:9===t.nodeType&&(t.defaultView||t.parentWindow)}y.contains=m.test(h.documentElement.compareDocumentPosition)||m.test(h.documentElement.contains)?function(t,e){var n=9===t.nodeType?t.documentElement:t,e=e&&e.parentNode;return t===e||!(!e||1!==e.nodeType||!(n.contains?n.contains(e):t.compareDocumentPosition&&16&t.compareDocumentPosition(e)))}:function(t,e){if(e)for(;e=e.parentNode;)if(e===t)return!0;return!1},p.contains=y.contains,y.each=function(t){if(t&&"function"==typeof t)for(var e=0;e<this.nodes.length;e++)t.call(this.nodes[e],this.nodes[e],e);return this},y.eacharg=function(n,r){var i=this;return this.each(function(e,t){i.args(n,e,t).forEach(function(t){r.call(this,e,t)},this)})},y.filter=function(e){var r=this,t=e instanceof p?function(t){return-1!==e.nodes.indexOf(t)}:"function"==typeof e?function(t){return e.apply(t,arguments)}:function(t){return t.matches=t.matches||t.prototype.matchesSelector||t.prototype.mozMatchesSelector||t.prototype.msMatchesSelector||t.prototype.oMatchesSelector||t.prototype.webkitMatchesSelector||function(t){for(var e=(r.document||r.ownerDocument).querySelectorAll(t),n=e.length;0<=--n&&e.item(n)!==r;);return-1<n},t.matches(e||"*")};return p(this.nodes.filter(t))},y.find=function(e){return this.map(function(t){return p(e||"*",t)})},y.first=function(){return this.nodes[0]||null},y.generate=function(t){return/^\s*<tr[> ]/.test(t)?p(h.createElement("table")).html(t).children().children().nodes:/^\s*<t(h|d)[> ]/.test(t)?p(h.createElement("table")).html(t).children().children().children().nodes:/^\s*</.test(t)?p(h.createElement("div")).html(t).children().nodes:h.createTextNode(t)},y.height=function(){return v(this.first()).height},y.html=function(e){return e===undefined?this.first().innerHTML||"":this.each(function(t){t.innerHTML=e})},y.inArray=function(t,e,n){var r;if(e)for(r=e.length,n=n?n<0?Math.max(0,r+n):n:0;n<r;n++)if(n in e&&e[n]===t)return n;return-1},p.inArray=y.inArray,y.index=function(t){return"string"==typeof t||typeof elm==undefined?-1:p.inArray(t instanceof p?t.first():t,this.nodes)},y.map=function(t){return t?p(this.array(t)).unique():this},y.on=function(t,e,i){var r=null,n=e,o=("string"==typeof e&&(r=e,n=i,e=function(e){var n=arguments;p(e.currentTarget).find(r).each(function(t){t!==e.target&&!function r(n,t){return!!(n&&t&&t.childNodes&&t.childNodes.length)&&[].slice.call(t.childNodes).filter(function(t){var e=t===n;return!e&&t.childNodes&&t.childNodes.length?r(n,t):e}).length}(e.target,t)||i.apply(t,n)})}),function(t){return e.apply(this,[t].concat(t.detail||[]))});return this.eacharg(t,function(t,e){t.addEventListener(e,o),t.__evt=t.__evt||{},t.__evt[e]=t.__evt[e]||[],t.__evt[e].push({callback:o,orig_callback:n,selector:r})})},y.bind=y.on,y.off=function(t,i){return this.eacharg(t,function(n,r){p(n.__evt?n.__evt[r]:[]).each(function(t,e){null!=i&&t.orig_callback!==i||(n.removeEventListener(r,t.callback),n.__evt&&(1==n.__evt[r].length?n.__evt[r]=[]:n.__evt[r].splice(e,1)))})})},y.unbind=y.off,y.offset=function(){var t,e={top:0,left:0},n=this.first(),r=n&&n.ownerDocument;if(r)return t=r.documentElement,"undefined"!=typeof n.getBoundingClientRect&&(e=n.getBoundingClientRect()),n=b(r),{top:e.top+(n.pageYOffset||t.scrollTop)-(t.clientTop||0),left:e.left+(n.pageXOffset||t.scrollLeft)-(t.clientLeft||0)}},y.pairs=function(n,t,e,r){var i;return void 0!==t&&(i=n,(n={})[i]=t),"object"==typeof n?this.each(function(t){for(var e in n)r(t,e,n[e])}):this.length?e(this.first(),n):""},y.scrollLeft=function(){var t=this.first(),e=b(t);return e?"pageXOffset"in e?e.pageXOffset:e.document.documentElement.scrollLeft:t.scrollLeft},y.scrollTop=function(){var t=this.first(),e=b(t);return e?"pageYOffset"in e?e.pageYOffset:e.document.documentElement.scrollTop:t.scrollTop},y.select=function(t,e){return t=t.replace(/^\s*/,"").replace(/\s*$/,""),/^</.test(t)?p().generate(t):(e||h).querySelectorAll(t)},y.slice=function(t){return t&&0!==t.length&&"string"!=typeof t&&"function"!=typeof t?t.length?[].slice.call(t.nodes||t):[t]:[]},y.str=function(e,n){return function(t){return"function"==typeof t?t.call(this,e,n):t.toString()}},y.unique=function(){return p(this.nodes.reduce(function(t,e){return null!==e&&e!==undefined&&!1!==e&&-1===t.indexOf(e)?t.concat(e):t},[]))},y.visible=function(){var t,e=this.first();{if(this.support.reliableHiddenOffsets)return!(e.offsetWidth<=0&&e.offsetHeight<=0&&!e.getClientRects().length);var n=e;if(!y.contains(n.ownerDocument||h,n))return!1;for(;n&&1===n.nodeType;){if("none"===((t=n).style&&t.style.display)||"hidden"===n.type)return!1;n=n.parentNode}return!0}},y.width=function(){return v(this.first()).width},c.RAT?c.RAT.$Selector=p:console.warn("RAT is not defined")}(window);

  // Utilities
  function trim(str) {
    return (str && str.replace(/^\s+|\s+$/g, ''));
  }
  function isType(o, type) {
    return (Object.prototype.toString.call(o) === '[object '+type+']');
  }
  function addListener(target, eventName, handler) {
    if (target.addEventListener) {
      target.addEventListener(eventName, handler, false);
    } else if (target.attachEvent) {
      target.attachEvent('on' + eventName, handler);
    }
  }
  function toInt(str) {
    var val = window.parseInt(str, 10);
    return (isNaN(val) ? undefined : val);
  }
  function toFloat(str) {
    var val = window.parseFloat(str);
    return (isNaN(val) ? undefined : val);
  }
  function toArray(str, convert) {
    var elements = [];
    if (str) {
      // Remove optional enclosing brackets
      elements = str.replace(/^\[|]$/g, '').split(',');
      for (var i = 0; i < elements.length; ++i) {
        elements[i] = trim(elements[i]);
        if (convert) {
          elements[i] = convert(elements[i]);
        }
      }
    }
    return elements;
  }
  function toIntArray(str) {
    return toArray(str, toInt);
  }
  function toFloatArray(str) {
    return toArray(str, toFloat);
  }
  function revertSingleQuoting(str) {
    return str.replace(/(\\?')|(")|(&apos;)|(&quot;)/g, function(match, singleQ, doubleQ, singleQHtml, doubleQHtml) {
      if (singleQ === "'") { return '"'; }
      if (singleQ === "\\'" || singleQHtml) { return "'"; }
      if (doubleQ || doubleQHtml) { return '\\"'; }
    });
  }
  function toJson(str) {
    var source;
    if (!isType(str, 'String')) {
      source = '';
    } else if (/^{?"/.test(str)) {
      source = str;
    } else { // Assume single quoting
      source = revertSingleQuoting(str);
    }
    source = source.replace(/^{?/, '{').replace(/}?$/, '}'); // complement brackets if missing
    try {
      return JSON.parse(source);
    } catch (e) {
      return {};
    }
  }
  function toJsonArray(str) {
    var source;
    if (!isType(str, 'String')) {
      source = '';
    } else if (/^\[{"/.test(str)) {
      source = str;
    } else { // Assume single quoting
      source = revertSingleQuoting(str);
    }
    source = source.replace(/^\[?/, '[').replace(/]?$/, ']'); // complement brackets if missing
    try {
      return JSON.parse(source);
    } catch (e) {
      return [];
    }
  }

  function parseEventConfig(attr) { // jshint ignore:line
    var config = {};
    if (isType(attr, 'String')) {
      if (attr.charAt(0) === '{') {
        config = toJson(attr);
      } else {
        var events = attr.split(',');
        for (var i = 0, ln = events.length; i < ln; i++) {
          config[events[i]] = [];
        }
      }
    }
    return config;
  }

  // Generated from ratGeneric.idl, don't change these 2 lines
  var parameterDefinitions = {"ratAbTest":["abtest","STRING"],"ratTestTargeting":["abtest_target","JSON"],"ratAccountId":["acc","INT"],"ratAffiliateId":["afid","INT"],"ratAdultFlag":["aflg","INT"],"ratServiceId":["aid","INT"],"ratArea":["area","STRING_ARRAY"],"ratAdobeSiteSection":["assc","STRING"],"ratBooksGenre":["bgenre","STRING_ARRAY"],"ratBrand":["brand","STRING_ARRAY"],"ratCartState":["cart","INT"],"ratCampaignCode":["cc","STRING"],"ratCheckout":["chkout","INT"],"ratCheckpoint":["chkpt","INT"],"ratIdfaCookie":["cka","STRING"],"ratContentLanguage":["cntln","STRING"],"ratComponentId":["compid","STRING_ARRAY"],"ratCountryCode":["country","STRING"],"ratCouponPrice":["coupon_price","DOUBLE_ARRAY"],"ratCouponId":["couponid","STRING_ARRAY"],"ratCustomParameters":["cp","JSON"],"ratCustomerId":["customerid","STRING"],"ratCvEvent":["cv","JSON"],"ratCurrencyCode":["cycode","STRING"],"ratCurrencyCodeList":["cycodelist","STRING_ARRAY"],"ratEeid":["eeid","STRING"],"ratErrorList":["errorlist","JSON_ARRAY"],"ratErrors":["errors","JSON"],"ratExcludeQuery":["esq","STRING"],"ratGenre":["genre","STRING"],"ratGoalId":["gol","STRING"],"ratItemGenre":["igenre","STRING_ARRAY"],"ratItemGenreNamePath":["igenrenamepath","STRING"],"ratItemGenrePath":["igenrepath","STRING"],"ratRmsItemNumber":["ino","STRING_ARRAY"],"ratItemTag":["itag","STRING_ARRAY"],"ratItemName":["item_name","STRING"],"ratItemId":["itemid","STRING_ARRAY"],"ratItemUrl":["itemurl","STRING"],"ratLanguage":["lang","STRING"],"ratMaker":["maker","STRING_ARRAY"],"ratItemCount":["ni","INT_ARRAY"],"ratItemCountOrder":["ni_order","INT_ARRAY"],"ratOrAnd":["oa","STRING"],"ratOrderId":["order_id","STRING"],"ratOrderList":["order_list","STRING_ARRAY"],"ratPayment":["payment","STRING"],"ratPageLayout":["pgl","STRING"],"ratPageName":["pgn","STRING"],"ratPageSection":["pgs","STRING"],"ratPageType":["pgt","STRING"],"ratPhoenixPattern":["phoenix_pattern","STRING"],"ratPointPrice":["point_price","DOUBLE_ARRAY"],"ratProductCode":["prdctcd","STRING_ARRAY"],"ratPrice":["price","DOUBLE_ARRAY"],"ratPublisher":["publisher","STRING_ARRAY"],"ratRanCode":["rancode","STRING"],"ratRequestResult":["reqc","STRING"],"ratReservationMadeDate":["rescreadate","STRING"],"ratReservedDate":["resdate","STRING"],"ratReservationId":["reservation_id","STRING"],"ratResultLayout":["reslayout","STRING"],"ratSearchCondition":["scond","STRING_ARRAY"],"ratSearchEntity":["search_entity","INT_ARRAY"],"ratServiceType":["service","STRING"],"ratShopGenre":["sgenre","STRING"],"ratShippingMethod":["shipping","STRING"],"ratShippingFee":["shipping_fee","DOUBLE_ARRAY"],"ratShopId":["shopid","STRING"],"ratShopIdList":["shopidlist","STRING_ARRAY"],"ratShopUrl":["shopurl","STRING"],"ratShopUrlList":["shopurllist","STRING_ARRAY"],"ratSphinxPattern":["sphinx_pattern","STRING"],"ratSearchQuery":["sq","STRING"],"ratRetryType":["srt","STRING"],"ratSiteSection":["ssc","STRING"],"ratTag":["tag","STRING_ARRAY"],"ratTargetElement":["target_ele","STRING"],"ratTotalPrice":["total_price","DOUBLE_ARRAY"],"ratVariantid":["variantid","STRING_ARRAY"],"ratItemVariation":["variation","JSON_ARRAY"],"ratWidowbirdPattern":["wb_pattern","STRING"]};
  var customParameterDefinitions = {"ratHits":["hits","INT"],"ratResultsPageNumber":["rpgn","INT"],"ratSort":["sort","INT"],"ratTotalResults":["totalresults","INT"],"ratClickTarget":["clktgt","STRING"],"ratNotificationCount":["notification","INT"],"ratItemStockNumber":["istocknum","STRING_ARRAY"],"ratItemPoint":["ipoint","INT_ARRAY"],"ratItemReviewNumber":["irevnum","INT_ARRAY"],"ratItemSoldOutStatus":["soldout","INT_ARRAY"],"ratNumberOfImages":["nimg","INT"],"ratStoryAbTest":["storyab","STRING"],"ratStoryATestTerm":["aterm","STRING"],"ratStoryAbTestTerm":["abterm","STRING"],"ratEventDiscriminator":["edisc","INT"],"ratCouponKey":["couponkey","STRING"],"ratToolbarId":["tbid","STRING"],"ratUserOs":["os","STRING"],"ratToolbarVersion":["tbver","STRING"],"ratFilterItemAvailable":["fa","INT"],"ratFilterFreeShipping":["fs","INT"],"ratRecMpt":["mpt","INT"],"ratRecMpn":["mpn","STRING"],"ratRecMpd":["mpd","INT"],"ratRecMpl":["mpl","STRING"],"ratRecMpe":["mpe","STRING"]};

  var SHORT_ID = 0, TYPE = 1;
  var typeConversion = {
    'INT' : toInt,
    'DOUBLE' : toFloat,
    'BOOLEAN_ARRAY' : toArray,
    'STRING_ARRAY' : toArray,
    'INT_ARRAY' : toIntArray,
    'DOUBLE_ARRAY' : toFloatArray,
    'JSON' : toJson,
    'JSON_ARRAY' : toJsonArray
  };

  function addByDefinition(key, value, parameterContainer, definitions) {
    if (definitions[key]) {
      var paramDef = definitions[key];
      var shortId = paramDef[SHORT_ID];
      var conversionFunction = typeConversion[ paramDef[TYPE] ];
      parameterContainer[shortId] = conversionFunction ? conversionFunction(value) : value;
      return true;
    }
    return false;
  }

  // Load core library
  var scriptEl = document.createElement('script');
  scriptEl.type = 'text/javascript';
  scriptEl.async = 'async';
  scriptEl.defer = 'defer';
  scriptEl.src = 'https://r.r10s.jp/com/rat/js/ral-1.10.1.js';
  var targetEl = document.getElementsByTagName('script')[0];
  targetEl.parentNode.insertBefore(scriptEl, targetEl);

  var extCookies = {}, parameters = {}, customParameters = {}, hasCustomParameters = false;

  function setCustomCookies() {
    if (document.getElementById('ratCookie')) {
      var customCookies = toJson(document.getElementById('ratCookie').value);
      RAL.callQueue.push(['setCookieNames', customCookies]);
    } else {
      return false;
    }
    return true;
  }
  setCustomCookies();

  var getDelta = function(elementParams, parameters) {
  var delta = {}, hasDelta = false;
  if (elementParams) {
    if (elementParams === 'all') {
      delta = parameters;
      hasDelta = true;
    } else {
      var list = elementParams.split(',');
      for (var i = 0; i < list.length; i++) {
        var param = document.getElementById(trim(list[i]));
        if (param) {
          hasDelta = addByDefinition(trim(param.id), trim(param.value), delta, parameterDefinitions) || hasDelta;
        }
      }
    }
  }
  return hasDelta ? delta : null;
}; // jshint ignore:line

  function parseInputTags() {
    var ratInput = [];
    var inputList = document.getElementsByName('rat');
    for (var i = 0; i < inputList.length; ++i) {
      ratInput.push(inputList[i]);
    }
    inputList = document.getElementById('ratForm') || [];
    for (i = 0; i < inputList.length; ++i) {
      ratInput.push(inputList[i]);
    }
    if (ratInput.length) {
      hasCustomParameters = false;
      for (i = 0; i < ratInput.length; ++i) {
        var paramId = trim(ratInput[i].id);
        var paramValue = trim(ratInput[i].value || ratInput[i].getAttribute('value'));
        if (!addByDefinition(paramId, paramValue, parameters, parameterDefinitions)) {
            hasCustomParameters = addByDefinition(paramId, paramValue, customParameters, customParameterDefinitions) || hasCustomParameters;
        }
      }
      if (parameters.cp !== undefined) {
        for (var key in parameters.cp) {
          customParameters[key] = parameters.cp[key];
        }
        delete parameters.cp;
        hasCustomParameters = true;
      }
    }
  }

  // Dynamic Params
  // The following variable is used as cache, value will be assigned after the first time of executing `convertAttrVal`
  var paramDataTypeMap = null
  function convertAttrVal(paramName, paramVal) {
    // Memoize parameter "name:type"
    if (!paramDataTypeMap) {
      paramDataTypeMap = {}
      for (var param in parameterDefinitions) {
        paramDataTypeMap[parameterDefinitions[param][0]] = parameterDefinitions[param][1]
      }
    }

    // Do nothing for string values
    if (paramDataTypeMap[paramName] != 'STRING') {
      // convert value
      var conversionHandler = typeConversion[paramDataTypeMap[paramName]]
      if (conversionHandler) {
        return conversionHandler(paramVal)
      }

      return
    }

    return paramVal
  }

  function isValueEmpty(value) {
    // Undefined
    if (value === undefined) {
      return true
    }

    // String, Number(Int)
    if (isType(value, 'String') || isType(value, 'Number')) {
      return !value
    }

    // Object
    if (isType(value, 'Object')) {
      return Object.keys(value).length == 0
    }

    // Array
    if (isType(value, 'Array')) {
      return !value.length
    }

    return false
  }

  // Returns [namespace, param_name, param_val]
  function createParamArr(attrNode) {
    var arr = []
    var name = attrNode.name.toLowerCase()
    var value = attrNode.value

    if (/^data-rat-cp-.*/.test(name)) {
      name = name.substring(12)
      arr = ['cp', name]

      if (!/^[a-z0-9]+(?:_+[a-z0-9]+)*$/.test(name)) {
        return []
      }
    } else if (/^data-rat-.*/.test(name)) {
      name = name.substring(9)

      // exclude: acc, aid, etype
      if (/\b(acc|aid|etype)\b/i.test(name)) {
        return []
      }

      arr = ['top', name]
      value = convertAttrVal(name, value)
    } else {
      return []
    }

    if (!isValueEmpty(value)) {
      arr.push(value)
    } else {
      return []
    }

    return arr
  }

  function getElementDynamicParams(elem) {
    var dynamicParams = {
      top: null,
      cp: null
    }
    var elemAttrs = elem.attributes

    for (var i = 0; i < elemAttrs.length; i++) {
      var attrNode = elemAttrs[i]
      var paramArr = createParamArr(attrNode)

      if (paramArr.length) {
        var namespace = paramArr[0]
        !dynamicParams[namespace] && (dynamicParams[namespace] = {})
        dynamicParams[namespace][paramArr[1]] = paramArr[2]
      }
    }

    return dynamicParams
  }


  function trackPageview(pvParameters) {
    if (pvParameters === undefined) {
      pvParameters = parameters;
    }
    // Insert hook first so we don't overwrite anything
    if (isType(RAT.pvHook, 'Object')) {
      RAL.callQueue.push(['setParameters', RAT.pvHook]);
      RAT.pvHook = {};
    }
  
    // Computed parameters
    if (!pvParameters.pgn || !pvParameters.ssc) {
      var pathMatch = (document.location.href || '').match(/https?:\/\/[^\/$#?]+(\/[^$#?]+)?/);
      if (pathMatch) {
        if (!pvParameters.pgn) pvParameters.pgn = pathMatch[1] || 'top';
        if (!pvParameters.ssc) pvParameters.ssc = (pathMatch[1] && pathMatch[1].split('/')[1]) ? '/' + pathMatch[1].split('/')[1] : 'top';
      }
    }
  
    RAL.callQueue.push(['setParameters', pvParameters]);
    RAL.callQueue.push(['setParameters', extCookies]);
    if (hasCustomParameters) {
      RAL.callQueue.push(['setCustomParameters', customParameters]);
    }
    if ($) {
      var $ratElements = $('[data-ratId]');
      var pvCompids = [];
      $ratElements.each(function() {
        var $element = $(this);
        if (/\bpv\b/.test($element.attr('data-ratEvent'))) {
          pvCompids.push($element.attr('data-ratId'));
        }
      });
      if (pvCompids.length) {
        RAL.callQueue.push(['appendParameters',  {'compid' : pvCompids}]);
      }
    }
  
    // jshint ignore:start
    // Custom Selector
    if (!$) {
      var $Selector = RAT.$Selector
      var $ratElements = $Selector('[data-ratId]');
      var pvCompids = [];
      $ratElements.each(function() {
        var $element = $Selector(this);
        if (/\bpv\b/.test($element.attr('data-ratEvent'))) {
          pvCompids.push($element.attr('data-ratId'));
        }
      });
      if (pvCompids.length) {
        RAL.callQueue.push(['appendParameters',  {'compid' : pvCompids}]);
      }
    }
    // jshint ignore:end
  
    RAL.callQueue.push(['setEvent', 'pv']);
  }

  var defineAppear = function($) {
  if ($.fn && !$.fn.appear) {
    /*
    jQuery.appear
    http://code.google.com/p/jquery-appear/
    Copyright (c) 2009 Michael Hixson
    Licensed under the MIT license (http://www.opensource.org/licenses/mit-license.php)
    */
    // jshint ignore:start
    (function(a){a.fn.appear=function(e,c){var d=a.extend({data:void 0,one:!0,ratio:0},c);return this.each(function(){var b=a(this);b.appeared=!1;if(e){var g=a(window),f=function(){if(b.is(":visible")){var a=g.scrollLeft(),e=a+g.width(),c=g.scrollTop(),f=c+g.height(),h=b.offset(),l=h.left,m=l+b.width(),h=h.top,n=h+b.height(),k=!isNaN(d.ratio)&&0<d.ratio&&1>=d.ratio?d.ratio:0,k=Math.max(1,k*b.width()*b.height()),a=Math.max(0,Math.min(e,m)-Math.max(a,l)),c=Math.max(0,Math.min(f,n)-Math.max(c,h));a*c>=k?
    b.appeared||b.trigger("appear",d.data):b.appeared=!1}else b.appeared=!1},c=function(){b.appeared=!0;if(d.one){g.unbind("scroll",f);var c=a.inArray(f,a.fn.appear.checks);0<=c&&a.fn.appear.checks.splice(c,1)}e.apply(this,arguments)};if(d.one)b.one("appear",d.data,c);else b.bind("appear",d.data,c);g.scroll(f);a.fn.appear.checks.push(f);f()}else b.trigger("appear",d.data)})};a.extend(a.fn.appear,{checks:[],timeout:null,checkAll:function(){var e=a.fn.appear.checks.length;if(0<e)for(;e--;)a.fn.appear.checks[e]()},
    run:function(){a.fn.appear.timeout&&clearTimeout(a.fn.appear.timeout);a.fn.appear.timeout=setTimeout(a.fn.appear.checkAll,20)}});a.each("append prepend after before attr removeAttr addClass removeClass toggleClass remove css show hide".split(" "),function(e,c){var d=a.fn[c];d&&(a.fn[c]=function(){var b=d.apply(this,arguments);a.fn.appear.run();return b})})})($);
    // jshint ignore:end
  }
};
  var bindDataAttributeItemElements = function(parameters, extCookies, defineAppear, toArray, getDelta, getElementDynamicParams) {
  if ($) {
    $(function() {
      defineAppear($);
      var $ratUnit = $('[data-ratId]').filter(function() {
        return /\bitem\b/.test($(this).attr('data-ratUnit'));
      });
      if ($ratUnit.length === 0) {
        var itemDivTag = document.getElementById('ratItemDiv');
        var itemIdsTag = document.getElementById('ratItemId');
        if (itemDivTag && itemIdsTag) {
          $ratUnit = $(itemDivTag.value);
          var itemIds = toArray(itemIdsTag.value);
          $ratUnit.each(function(){
            $(this).attr('data-ratId', itemIds[$ratUnit.index(this)]);
          });
        }
      }
      $ratUnit.appear(function () {
        var $this = $(this);
        RAL.callQueue.push(['setAccountId', parameters.acc]);
        RAL.callQueue.push(['setServiceId', parameters.aid]);
        RAL.callQueue.push(['setPageType', parameters.pgt]);
        RAL.callQueue.push(['setParameters', {'pgl': parameters.pgl}]);
        RAL.callQueue.push(['setGenre', parameters.genre]);
        RAL.callQueue.push(['setSearchQuery', parameters.sq]);
        RAL.callQueue.push(['setParameters', {'oa': parameters.oa}]);
        RAL.callQueue.push(['appendParameters',  {'sresv' : $this.attr('data-ratId')}]);
        if (extCookies) {
          RAL.callQueue.push(['setParameters', extCookies]);
        }
        RAL.callQueue.push(['setParameters', getDelta($this.attr('data-ratParam'), parameters)]);
        var dynamicParams = getElementDynamicParams($this[0]);
        if (dynamicParams.top) {
          RAL.callQueue.push(['setParameters', dynamicParams.top]);
        }
        if (dynamicParams.cp) {
          RAL.callQueue.push(['setCustomParameters', dynamicParams.cp]);
        }
        RAL.callQueue.push(['setEvent', 'scroll']);
      });
    });
  }

  // Appear Event on page view inited (Custom Selector)
  if (!$) {
    var $Selector = RAT.$Selector;

    var $ratUnit = $Selector('[data-ratId]').filter(function() {
      return /\bitem\b/.test($Selector(this).attr('data-ratUnit'));
    });
    if ($ratUnit.length === 0) {
      var itemDivTag = document.getElementById('ratItemDiv');
      var itemIdsTag = document.getElementById('ratItemId');
      if (itemDivTag && itemIdsTag) {
        $ratUnit = $Selector(itemDivTag.value);
        var itemIds = toArray(itemIdsTag.value);
        $ratUnit.each(function(){
          $Selector(this).attr('data-ratId', itemIds[$ratUnit.index(this)]);
        });
      }
    }
    $ratUnit.appear(function () {
      var $this = $Selector(this);
      RAL.callQueue.push(['setAccountId', parameters.acc]);
      RAL.callQueue.push(['setServiceId', parameters.aid]);
      RAL.callQueue.push(['setPageType', parameters.pgt]);
      RAL.callQueue.push(['setParameters', {'pgl': parameters.pgl}]);
      RAL.callQueue.push(['setGenre', parameters.genre]);
      RAL.callQueue.push(['setSearchQuery', parameters.sq]);
      RAL.callQueue.push(['setParameters', {'oa': parameters.oa}]);
      RAL.callQueue.push(['appendParameters',  {'sresv' : $this.attr('data-ratId')}]);
      if (extCookies) {
        RAL.callQueue.push(['setParameters', extCookies]);
      }
      RAL.callQueue.push(['setParameters', getDelta($this.attr('data-ratParam'), parameters)]);
      var dynamicParams = getElementDynamicParams($this.nodes[0]);
      if (dynamicParams.top) {
        RAL.callQueue.push(['setParameters', dynamicParams.top]);
      }
      if (dynamicParams.cp) {
        RAL.callQueue.push(['setCustomParameters', dynamicParams.cp]);
      }
      RAL.callQueue.push(['setEvent', 'scroll']);
    });
  }
};

  function initPageview(savedParameters) {
    if (savedParameters === undefined) {
      savedParameters = parameters;
    }
    // Handle tracking for external domains
    if ( /\.rakuten\.co\.jp$/.test(document.domain) || setCustomCookies() ) {
      trackPageview(savedParameters);
    } else {
      var receiveFlag = false;

      var addEvent = function(node, type, handler) {
        if (node.addEventListener) {
          node.addEventListener(type, handler, false);
        } else {
          node.attachEvent("on" + type, handler);
        }
      };
      var removeEvent = function(node, type, handler) {
          if (node.removeEventListener) {
            node.removeEventListener(type, handler, false);
          } else {
            node.detachEvent("on" + type, handler);
          }
      };

      var createIframe = function() {
        var parentHost = encodeURIComponent(location.protocol + '//' + (location.hostname || location.pathname));
        var src = "https://www.rakuten.co.jp/com/rat/plugin/external/ral-iframe-rakuten.co.jp.html?o-id=" + parentHost;
        var iframe = document.createElement('iframe');
        iframe.setAttribute('src', src);
        iframe.style.display = 'none';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      };

      var checkStorage = function(key) {
        var hit = false;
        if (window.sessionStorage) {
          var value = sessionStorage.getItem(key);
          if (value) {
            try {
              extCookies = JSON.parse(value).data || {};
              hit = true;
            } catch (e) {}
          }
        }
        return hit;
      };
      var writeStorage = function(key, message) {
        if (window.sessionStorage) {
          try {
            sessionStorage.setItem(key, message);
            return true;
          } catch (e) {}
        }
        return false;
      };

      var getMessage = function(event) {
        if (/www\.rakuten\.co\.jp$/.test(event.origin)) {
          var message = event.data, response;
          if (typeof message === 'string') {
            try {
              response = JSON.parse(message) || {};
            } catch (e) { return; }
            if (response.type === 'ratCk') {
              extCookies = response.data || {};
              if (extCookies.cks && !extCookies.ckr) {
                extCookies.ckr = extCookies.cks;
              }
              trackPageview(savedParameters);
              clearTimeout(receiveFlag);
              writeStorage('ratCk', message);
              removeEvent(window, 'message', getMessage);
            }
          }
        }
      };

      if (checkStorage('ratCk')) {
        trackPageview(savedParameters);
      } else {
        addEvent(window, 'message', getMessage);
        createIframe();
        receiveFlag = setTimeout(function() {
          removeEvent(window, 'message', getMessage);
          trackPageview(savedParameters);
        }, 3000);
      }
    }

    bindDataAttributeItemElements(savedParameters, extCookies, defineAppear, toArray, getDelta, getElementDynamicParams);
  }

  RAT.addCustomEvent = function(evtData) {
    if (!isType(evtData, 'Object')) {
      return;
    }
    if (evtData.includeInput) {
      RAL.callQueue.push(["setParameters", parameters]);
    }
    RAL.callQueue.push(["setAccountId", evtData.accountId || parameters.acc]);
    RAL.callQueue.push(["setServiceId", evtData.serviceId || parameters.aid]);
    RAL.callQueue.push(["setPageType", parameters.pgt]);
    RAL.callQueue.push(["setPageName", parameters.pgn]);
    if (isType(evtData.pData, 'Object')) {
      var p = evtData.pData;
      if (p && isType(p.compid, 'Array') && !p.comptop && $) {
        p.comptop = [];
        for (var i = 0, len = p.compid.length; i < len; i++) {
          var $comp = $('[data-ratId="'+p.compid+'"]');
          if ($comp.length > 0) {
            p.comptop.push($comp.offset().top);
          }
        }
      }
      RAL.callQueue.push(["setParameters", evtData.pData]);
    }
    if (isType(evtData.apData, 'Object')) {
      RAL.callQueue.push(["appendParameters", evtData.apData]);
    }
    if (isType(evtData.cpData, 'Object')) {
      var cp = evtData.cpData;
      for (var prop in cp) {
        if (cp.hasOwnProperty(prop)) {
          RAL.callQueue.push(["setCustomParameters", cp]);
          break;
        }
      }
    }
    if (isType(evtData.cvData, 'Object')) {
      RAL.callQueue.push(["setParameters", {'cv':evtData.cvData}]);
    }
    if (isType(evtData.options, 'Array')) {
      RAL.callQueue.push(['setOptions', evtData.options]);
    }
    RAL.callQueue.push(['setParameters', extCookies]);
    RAL.callQueue.push(["setEvent", evtData.eventType || "async"]);
  };

  //grab all the rat input tags & parse them
  parseInputTags();

  var bindDataAttributeEvents = function bindDataAtrributeEvents(select, extCookies, getDelta, parseEventConfig, getElementDynamicParams) {
  function setTapClickListener(jqueryElem, handler) {
    var activeElement;
    var preventGhostClick = false;
    jqueryElem.bind('touchstart', function() {
      activeElement = this;
    });
    jqueryElem.bind('touchmove touchcancel', function() {
      activeElement = undefined;
    });
    jqueryElem.bind('touchend', function(event) {
      if (activeElement === this) {
        preventGhostClick = true;
        window.setTimeout(function() { preventGhostClick = false; }, 500);
        handler.call(this, event);
      } else {
        activeElement = undefined;
      }
    });
    jqueryElem.bind('click', function(event) {
      if (!preventGhostClick) {
        handler.call(this, event);
      }
    });
  }

  function handleRedirect(elem) {
    if (!RAL.live) {
      return;
    }
  
    var href = elem && elem.attributes && elem.attributes.href && elem.attributes.href.value;
    if (href && href !== window.location.href) {
      var processImmediate = function() {
        if (RAL.processImmediate) {
          RAL.processImmediate();
        }
      };
      if (RAL.getTransportMethod && RAL.getTransportMethod() !== 'beacon') {
        var transportMethod = RAL.getTransportMethod();
        RAL.callQueue.push(['setTransportMethod', 'beacon']);
        processImmediate();
        RAL.callQueue.push(['setTransportMethod', transportMethod]);
        processImmediate();
      } else {
        processImmediate();
      }
    }
  }
  
  /**
   * Gets the first element from either a jQuery or RAT.$Selector selected element object
   * RAT.$Selector stores elements in `nodes` array whereas jQuery uses direct array access
   */
  function firstElementFrom (selectedElement) {
    return selectedElement.nodes && selectedElement.nodes[0] || selectedElement[0];
  }
  
  function getParamsForDataAttributeEvent(select, selectedElement, eventType, acc, aid) {
    var params = [
      ['setParameters', getDelta(selectedElement.attr('data-ratParam'), parameters)],
      ['setAccountId', acc || parameters.acc],
      ['setServiceId', aid || parameters.aid],
      ['setPageType', parameters.pgt],
      ['setParameters', {'pgl': parameters.pgl}],
      ['appendParameters',  {'compid' : selectedElement.attr('data-ratId'), 'comptop' : selectedElement.offset().top}],
      ['setCustomParameters',  {'docheight' : select(document).height(), 'winheight' : select(window).height()}],
      ['setOptions', ['url', 'ua']]
    ];
    if (extCookies) {
      params.push(['setParameters', extCookies]);
    }
  
    var config = parseEventConfig(selectedElement.attr('data-ratEvent'))[eventType];
    if (select.inArray('cv', config) !== -1) {
      params.push(['setParameters', {'cv':toJson(selectedElement.attr('data-ratCvEvent'))}]);
    }
  
    var dynamicParams = getElementDynamicParams(firstElementFrom(selectedElement));
    if (dynamicParams.top) {
      params.push(['setParameters', dynamicParams.top]);
    }
  
    if (dynamicParams.cp) {
      params.push(['setCustomParameters', dynamicParams.cp]);
    }
  
    return params;
  }

  RAT.bindAppear = function($elem, acc, aid) {
    var $ratAppear = $elem.filter(function() {
      return parseEventConfig(select(this).attr('data-ratEvent')).appear !== undefined;
    });
    $ratAppear.appear(function () {
      var selectedElement = select(this);
      var eventType = 'appear';

      getParamsForDataAttributeEvent(select, selectedElement, eventType, acc, aid).forEach(function(params) {
        RAL.callQueue.push(params);
      });

      var eventMergeAppearElm = document.getElementById('ratMergeEventAppear');
      var shouldMergeAppear = true;
      if (eventMergeAppearElm && 'value' in eventMergeAppearElm) {
        shouldMergeAppear = eventMergeAppearElm.value == "false" ? false : true;
      }

      RAL.callQueue.push(['setEvent', 'appear', shouldMergeAppear]);
    });
  };

  RAT.bindClick = function($elem, acc, aid) {
    var $ratClick = $elem.filter(function() {
      return parseEventConfig(select(this).attr('data-ratevent')).click !== undefined;
    });

    setTapClickListener($ratClick, function () {
      var selectedElement = select(this);
      var eventType = 'click' ;

      getParamsForDataAttributeEvent(select, selectedElement, eventType, acc, aid).forEach(function(params) {
        RAL.callQueue.push(params);
      });

      RAL.callQueue.push(['setEvent', 'click']);
      handleRedirect(firstElementFrom(selectedElement));
    });
  };

  RAT.bind = function($elem, acc, aid) {
    RAT.bindAppear($elem, acc, aid);
    RAT.bindClick($elem, acc, aid);
  };

  var bindRatElements = function() {
    var $ratElements = select('[data-ratId]');
    RAT.bind($ratElements);
  };

  if ($) {
    $(bindRatElements);
  } else {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bindRatElements);
    } else {
      bindRatElements();
    }
  }

  addListener(document, 'RAT_BIND', function(event) {
    if (isType(event.data, 'String')) {
      RAT.bind(select(event.data));
    }
  });
};
  if ($) {
    defineAppear($);
    bindDataAttributeEvents($, extCookies, getDelta, parseEventConfig, getElementDynamicParams);
  } else {
    bindDataAttributeEvents(RAT.$Selector, extCookies, getDelta, parseEventConfig, getElementDynamicParams);
  }

  // page performance tracking
  function sendPerfData(timing) {
    RAT.addCustomEvent({
      options: ['url','ua'],
      eventType: 'perf',
      pData: {
        navperf: timing
      }
    });
  }

  function addPerfTracker() {
    if (!('performance' in window) || !window.performance.timing) return;
    var t = window.performance.timing;
    if (t.loadEventEnd === 0) {
      setTimeout(function() {
        sendPerfData(t);
      }, 500);
    } else {
      sendPerfData(t);
    }
  }

  function callOnLoad(callback) {
    if (window.addEventListener) {
      window.addEventListener('load', callback, false);
    } else if (window.attachEvent) {
      window.attachEvent('onload', callback);
    }
  }

  var perfFlag = document.getElementById('ratPagePerformance');
  if ((perfFlag && perfFlag.value === 'true') && (window === window.parent)) { //Note: to prevent perf events under iframe.
    callOnLoad(addPerfTracker);
  }

  var sendBeaconFlag = document.getElementById('ratTransportMethod');
  if (sendBeaconFlag && sendBeaconFlag.value === 'beacon') {
    RAL.callQueue.push(['setTransportMethod', 'beacon']);
  } else {
    // always default to xhr
    RAL.callQueue.push(['setTransportMethod', 'xhr']);
  }

  // Check XHR flag
  var xhrFlag = document.getElementById('ratEnableXHR');
  if (xhrFlag && xhrFlag.value === 'false') {
    RAL.callQueue.push(['setXHRAllowed', false]);
  }

  // Single page app PV tracking
  var singlePageFlag = document.getElementById('ratSinglePageApplicationLoad');
  if (singlePageFlag && singlePageFlag.value === 'true') {
    addListener(document, 'SINGLE_PAGE_APPLICATION_LOAD', function() {
      //clean up the global parameter objects before re-grabbing the input tags
      RAL.callQueue.push(['removeEventLogs']);
      parameters = {};
      customParameters = {};
      parseInputTags();
      // create a snapshot of the parameter values at the time of pv event initialization
      var savedParameters = JSON.parse(JSON.stringify(parameters));
      initPageview(savedParameters);
    });
  } else {
    initPageview();
  }

  // @@TestRAT
})();
