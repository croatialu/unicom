import qs from "qs";
import $ from "jquery";
import http from "./http";
import { getCookie, toggleDisplay, getQueryString, showEl, hideEl } from "./utils";
import setRem from "./setRem.js";

import "./css/reset.css";
import "./css/common.css";
import "./css/main.css";

// import VConsole from "vconsole";
// new VConsole();
// console.info("vconsole-info-测试");
const areas = ["广州", "深圳", "珠海", "中山", "江门"]
const openid = getCookie("openid");
const act_name = "20211118_zslt";
// 用户信息
let user = {};
// 倒计时
let countdown = 60;


/** 用户信息请求
 * A用户 
 * a1. 第一次进入：漫画页（首页） 
 * a2. 登录过(有tel)：漫画页去到【登记页】;
 * a3. 登记失败：同a2; 
 * a4. 登记成功：抽奖页; 
 * a5. 抽奖次数用完（6次）：抽奖页
 * B用户（通过A的分享海报扫码进入）
 * b1. 第一次助力且未登录：漫画页（首页），并且弹出登录弹窗，登录后弹出确认助力弹窗，助力完成后走a2流程
 * b2. 第一次助力已登录：漫画页（首页），并且弹出助力弹窗，助力完成后走a2流程
 * b3. 非第一次助力且已登录：漫画页（首页），并且弹出助力失败弹窗，关闭弹窗后走a2流程
 * b4. 非第一次助力且重复扫A的二维码：漫画页（首页），并且弹出助力成功弹窗
* **/
function getUserInfo() {
  http
    .get(`/get_user_info?openid=${openid}&act_name=${act_name}`)
    .then((res) => {
      if (res.data) {
        console.log("getuser", res);
        // 先判断是否是分享进来的
        if (getQueryString("share_openid")) {

        } else {
          // a1. 第一次进入：漫画页（首页） 
          if (!res.data.data) {
            // 暂无需要操作
          } else {
            // a2. 登录过(有tel)：漫画页去到【登记页】;
            user = res.data.data
          }
        }
        toggleDisplay($(".index"));
      } else {
        // 请求失败显示主页
        toggleDisplay($(".index"));
      }
    });
}

// 倒计时处理
function settime(val) {
  var int = setTimeout(function () {
    settime(val)
  }, 1000)

  if (countdown == 0) {
    showEl($(".sendcode-btn"))
    hideEl($(".sendcode-btn-empty"))
    clearInterval(int);
    countdown = 60;
  } else {
    $(".sendcode-btn-empty").text(countdown)
    countdown--;
  }
}

// 验证码--test mode
function getVcode(tel) {
  console.log("getVcode");
  http
    .get(`/get_vcode?openid=${openid}&act_name=${act_name}&tel=${tel}&type=test`)
    .then((res) => {
      if (res.data) {
        // 正常逻辑不需要处理什么
        const code = res.data.msg?.split("：")[1]
        $("#vcode").val(code)
      }
    });
}

// 登陆
function login(tel, vcode) {
  console.log("login");
  http
    .get(`/tel_login?openid=${openid}&act_name=${act_name}&tel=${tel}&vcode=${vcode}`)
    .then((res) => {
      if (res.data) {
        const area = res.data.data
        // 如果不在5个城市内，打开登记失败弹窗
        if (!areas.includes(area)) {
          showEl($(".checkin-fail"))
        } else {
          // 符合要求，去登记页
          toggleDisplay(".checkin")
        }
      }
    });
}

$(function () {
  setRem(750, 750, 320);

  getUserInfo();

  // 首页点击
  $(".index").on("click", function () {
    if (user.tel) {
      toggleDisplay($(".checkin"));
      return
    }
    toggleDisplay($(".login"));
  });

  // 发送验证码
  $(".sendcode-btn").on("click", function () {
    const tel = $("#tel").val();
    if (tel) {
      showEl($(".sendcode-btn-empty"))
      hideEl($(".sendcode-btn"))
      settime($(".sendcode-btn-empty"))
      getVcode(tel)
    }
  });

  // 登陆按钮
  $(".login-btn").on("click", function () {
    const tel = $("#tel").val();
    const vcode = $("#vcode").val();
    if (tel && vcode) {
      login(tel, vcode)
    }
  });

  // 弹窗的关闭按钮
  $(".close-btn").on("click", function () {
    const popup = $(this).parent(".popup-wrap")
    hideEl(popup)
  });
});
