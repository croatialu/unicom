import $ from "jquery";

// 获取cookie
export function getCookie(cname) {
  var name = cname + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i].trim();
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

// 切换展示的模块
export function toggleDisplay(selector) {
  $("html,body").animate({ scrollTop: 0 }, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  selector
    .removeClass("hide")
    .addClass("show")
    .siblings()
    .removeClass("show")
    .addClass("hide");
}

// 展示模块
export function showEl(selector) {
  selector.removeClass("hide").addClass("show");
}

// 隐藏模块
export function hideEl(selector) {
  selector.removeClass("show").addClass("hide");
}

// 获取URL上的query
export function getQueryString(name) {
  let reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
  let r = window.location.search.substr(1).match(reg);
  if (r != null) {
    return decodeURIComponent(r[2]);
  };
  return null;
}

var winHeight = $(window).height(); //获取当前页面高度
$(window).on("resize", function () {
  var thisHeight = $(this).height();
  if (winHeight - thisHeight > 50) {
    //当软键盘弹出，在这里操作
    $(".info-bottom").addClass("hide");
    $("#info").addClass("hide");
    console.log("软键盘弹出");
  } else {
    //当软键盘收起，在此处操作
    console.log("软键盘收起");
    $(".info-bottom").removeClass("hide");
    $("#info").removeClass("hide");
  }
});