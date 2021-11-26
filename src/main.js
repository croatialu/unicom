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
const QRCode = require('qrcode');
const areas = ["广州", "深圳", "珠海", "中山", "江门"]
const openid = getCookie("openid");
const act_name = "20211118_zslt";
// 能否抽奖
let canDraw = true;
// 剩余抽奖次数
if (localStorage.getItem("initCount") == null) {
  localStorage.setItem("initCount", 1)
}
// 剩余助力次数
if (localStorage.getItem("helpCount") == null) {
  localStorage.setItem("helpCount", 1)
}
// 总抽奖次数
let drawTotal = 0;// 最多是5次
// 用户信息
let user = {};
// 倒计时
let countdown = 60;
// 助力openid
let share_openid = localStorage.getItem("share_openid") || "";
// 抽奖奖品
const prizes = [{
  name: "千兆路由器100元代金券",
  image: ""
}, {
  name: "500元加油卡",
  image: "",
}, {
  name: "科沃斯扫地机器人",
  image: ""
}, {
  name: "随机金额微信红包",
  image: ""
}, {
  name: "10元话费",
  image: ""
}, {
  name: "免3个月宽带费用",
  image: ""
}]
// 需要核销的产品
const shouldPrize = ["千兆路由器100元代金券"];
// 奖品对照的样式映射
const prizeMap = {
  '10元话费': "phoneBill", // 电话费
  '免3个月宽带费用': "network", // 宽带费用
  '500元加油卡': "fuelCard", // 加油卡
  '100元采蝶轩代金券': "CDVoucher", // 100元采蝶轩代金券
  '小度音箱': "AISpeaker", // 小度音箱
  '科沃斯扫地机器人': "robot", // 科沃斯扫地机器人
  '0.88元微信红包': "money",	//0.88元微信红包
  '2.88元微信红包': "money",
  '3.88元微信红包': "money",
  '6.88元微信红包': "money",
  '8.88元微信红包': "money",
  '8.88元微信红包': "money",
}

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
function getUserInfo(flag = true) {
  http
    .get(`/get_user_info?openid=${openid}&act_name=${act_name}`)
    .then((res) => {
      if (res.data) {
        console.log("getuser", res);
        // 先判断是否是分享进来的
        const share_openid = getQueryString("share_openid");
        if (share_openid) {
          localStorage.setItem("share_openid", share_openid)
          if (!res.data.data) showEl($(".index-login-wrap"))
          else {
            if (localStorage.getItem("helpCount") != 0) {
              showEl($(".index-help-wrap"))
            } else {
              showEl($(".help-fail-wrap"))
            }
          }
          toggleDisplay($(".index"));
        } else {
          // a1. 第一次进入：漫画页（首页） 
          if (!res.data.data) {
            // 暂无需要操作
          } else {
            // a2. 登录过(有tel)：漫画页去到【登记页】;
            user = res.data.data
            // 判断登记失败还是成功
            if (areas.includes(user?.tel_city) && user.address) {
              $(".icon-phone").text("联系号码：" + user.tel)
              $(".icon-addr").text("联系地址：" + user.address + user.address_more)
              showEl($(".checkin-success-result"))
              hideEl($(".checkin-result"))
            } else if (!areas.includes(user?.tel_city)) {
              showEl($(".checkin-fail-result"))
              hideEl($(".checkin-result"))
            }
            // 配置抽奖次数
            drawTotal = user?.help_list?.length ? parseInt(user?.help_list?.length / 3) : 0;
            if (drawTotal > 5) drawTotal = 5;
            const process = user?.prize_list?.length ? user?.prize_list?.length + 1 : 1;
            const canDrawCount = drawTotal + Number(localStorage.getItem("initCount"));
            $(".draw-tips").text("当前抽奖次数：" + canDrawCount)
            $(".draw-process").addClass(`progress${process}`)
            // 配置我的好友
            if (!user?.help_list?.length) {
              $(".friend-tips").text("当前未有呼叫成功的好友")
              hideEl($(".friends"))
            } else {
              $(".friend-tips").text(`当前共呼叫成功${user?.help_list?.length}个好友`)
              user?.help_list.map(item => {
                $(".friends").append(`<div class="flx-col flx-all-center friends-item">
                <img src=${item.headimgurl} class="head">
                <div class="name row-2">${item.nickname}</div>
              </div>`)
              })
            }
            // 配置我的奖品展示
            console.log("user?.prize_list", user?.prize_list?.length)
            if (user?.prize_list?.length) {
              $(".title-text").text(`我的号码：${user.tel}`)
              $(".prize1-content").remove();
              $(".prize-verify").find(".prize2-content").remove();
              user?.prize_list?.map(item => {
                if (shouldPrize.includes(item.prize)) {
                  console.log("sdfas", shouldPrize)
                  $(".has-prize").prepend(`
                  <div class="bg prize1-content flx-end">
                    <div class="bg prize-checkin-btn"></div>
                  </div>`)
                }
                if (!["千兆路由器100元代金券", "谢谢惠顾"].includes(item.prize) && prizeMap[item.prize]) {
                  $(".prize-verify").append(`
                  <div class="bg flx-all-center prize2-content">
                    <div class="bg prize-item ${prizeMap[item.prize]}"></div>
                    <div>${item.prize}</div>
                  </div>`)
                }
              })
            } else {
              // 没有奖品
              $(".title-text").text(`我的号码：${user.tel}`)
              hideEl($(".has-prize"))
              showEl($(".none-prize"))
            }
          }
          if (flag) {
            toggleDisplay($(".index"));
          }
        }
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
        // 如果是助力流程
        if (share_openid) {
          hideEl($(".index-login-wrap"))
          showEl($(".index-help-wrap"))
          return
        }
        // 如果不在5个城市内，打开登记失败弹窗
        if (!areas.includes(area)) {
          toggleDisplay($(".checkin"))
          showEl($(".checkin-fail"))
          hideEl($(".checkin-result"))
          showEl($(".checkin-fail-result"))
        } else {
          // 符合要求，去登记页
          toggleDisplay($(".checkin"))
        }
      }
    });
}

// 登记信息
function checkin(address, address_more) {
  console.log("checkin");
  http
    .get(`/leave_userinfo?openid=${openid}&act_name=${act_name}&address=${address}&address_more=${address_more}`)
    .then((res) => {
      if (res.data) {
        // 登记成功 -> 登记成功弹窗，修改登记页面显示(在userinfo接口也应判断显示)
        if (res.data.code == 0) {
          showEl($(".checkin-success"))
          $(".icon-phone").text("联系号码：" + user.tel)
          $(".icon-addr").text("联系地址：" + address + address_more)
          showEl($(".checkin-success-result"))
          hideEl($(".checkin-result"))
        } else {
          // 登记失败 -> 登记失败弹窗，修改登记页面显示(在userinfo接口也应判断显示)
          showEl($(".checkin-fail"))
          showEl($(".checkin-fail-result"))
          hideEl($(".checkin-result"))
        }
      }
    });
}

// 获取中奖名单
function getPrizing() {
  console.log("getPrizing");
  http
    .get(`/draw_list`)
    .then((res) => {
      if (res.data) {
        res.data?.data?.map(item => {
          $(".prizing-swiper").children(".swiper-wrapper").append(`<div class="swiper-slide">恭喜${item.nickname}抽中${item.prize}</div>`)
        })
        runPrizing()
      }
    });
}

// 中奖信息滚动
function runPrizing() {
  new Swiper('.prizing-swiper', {
    loop: true,
    slidesPerView: "auto",
    spaceBetween: 30,
    autoplay: true,
  })
}

// 构建奖品信息
function makePrizes() {
  console.log("makePrizes");
  prizes.map((item, index) => {
    $(".draw-prize-swiper")
      .children(".swiper-wrapper")
      .append(`<div class="swiper-slide">
      <div class="bg ${index % 2 === 0 ? 'greed-wrap' : 'red-wrap'}">
        <div class="bg prize-item-wrap prize${index + 1}"></div>
      </div>
      <div class="prize-text row-2">${item.name}</div>
    </div>`)
  })
  runPrizeItem()
}

// 奖品信息滚动
function runPrizeItem() {
  new Swiper('.draw-prize-swiper', {
    loop: true,
    slidesPerView: 3,
    autoplay: true,
  })
}

// 抽奖
function drawPrize() {
  console.log("draw");
  if (canDraw && drawTotal + Number(localStorage.getItem("initCount"))) {
    canDraw = !canDraw
    http
      .get(`/draw?openid=${openid}`)
      .then((res) => {
        if (res.data) {
          // 抽奖次数不足
          if (res.data.code === 20003) {
            showEl($(".draw-fail"))
            return
          }
          localStorage.setItem("initCount", 0)
          if (res.data.code == 0) {
            // 抽奖成功，改变进度条，减少抽奖次数，直接调用user接口
            getUserInfo(false)
            canDraw = !canDraw
            // "千兆路由器100元代金券", 
            if (!["谢谢惠顾"].includes(res.data.data) && prizeMap[res.data.data]) {
              $(".draw-sussess-content").prepend(`
            <div class="prize-wrap flx-col flx-all-center">
              <div class="bg myprize ${prizeMap[res.data.data]}"></div>
              <div class="myprize-text">${res.data.data}</div>
            </div>
            `)
              showEl($(".draw-success"))
            }
          } else if (res.data.msg == "C02") {
            // 谢谢惠顾
            showEl($(".draw-fail"))
          }
        }
      });
  }
}

// 生成链接
function shareLink() {

}

// 生成二维码
function sharePost() {
  QRCode.toCanvas(document.getElementById('canvas'),
    `http://h5.szhhhd.com/jx/a20211118_zslt?share_openid=${openid}`,
    function (error) {
      if (error) console.error(error)
      showEl($(".poster"))
    })
}

// 助力
function helpFriend() {
  http
    .get(`/help_somebody?openid=${openid}&act_name=${act_name}&share_openid=${share_openid}`)
    .then((res) => {
      if (res.data.code == 0) {
        hideEl($(".index-help-wrap"))
        showEl($(".help-success-wrap"))
      } else {
        hideEl($(".index-help-wrap"))
        showEl($(".help-fail-wrap"))
      }
    })
}

$(function () {
  setRem(750, 750, 320);
  getUserInfo();

  // 首页点击
  // $(".index").on("click", function () {
  //   if (user.tel) {
  //     toggleDisplay($(".checkin"));
  //     return
  //   }
  //   toggleDisplay($(".login"));
  // });

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

  // 打开地址选择弹窗
  $("#address").on("click", function () {
    showEl($(".address-select-bg"))
  });

  // 选择地址
  $(".select-address").on("click", "li", function (ev) {
    const value = ev.target.innerText;
    $("#address").val(value);
    hideEl($(".address-select-bg"))
  });

  // 登记
  $(".checkin-btn").on("click", function () {
    const address = $("#address").val();
    const address_more = $("#address_more").val();
    if (address && address_more) {
      checkin(address, address_more)
    }
  });

  // 右侧抽奖按钮
  $(".icon-draw").on("click", function () {
    getPrizing();
    makePrizes();
    toggleDisplay($(".prize-page"))
  });

  // 抽奖
  $(".draw-btn").on("click", function () {
    drawPrize()
  });

  // 我的奖品页
  $(".draw-sussess-btn").on("click", function () {
    // 重新获取一下用户的中奖信息
    getUserInfo(false)
    hideEl($(".draw-success"))
    showEl($(".my-prize-wrap"))
  });

  // 抽奖页都返回按钮 -> 登记页
  $(".back-btn").on("click", function () {
    toggleDisplay($(".checkin"))
  });

  // 登记失败弹窗按钮 -> 抽奖
  $(".checkin-fail-btn").on("click", function () {
    getPrizing();
    makePrizes();
    toggleDisplay($(".prize-page"))
  });

  // 生成链接
  $(".link-btn").on("click", function () {
    toggleDisplay($(".prize-page"))
  });

  // 生成链接
  $(".poster-btn").on("click", function () {
    sharePost()
  });

  // 我的奖品按钮
  $(".prize-btn ").on("click", function () {
    // 重新获取一下用户的中奖信息
    getUserInfo(false)
    showEl($(".my-prize-wrap"))
  });

  // 助力弹窗返回首页
  $(".back-close-btn").on("click", function () {
    toggleDisplay($(".index"))
  });

  // 确认助力
  $(".help-btn").on("click", function () {
    if (localStorage.getItem("helpCount")) {
      localStorage.setItem("helpCount", 0)
      helpFriend()
    } else {
      hideEl($(".index-help-wrap"))
      showEl($(".help-fail-wrap"))
    }
  });

  // 我要拿红包按钮
  $(".help-index-btn").on("click", function () {
    toggleDisplay($(".index"))
  });
});
