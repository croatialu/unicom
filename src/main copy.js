import $ from "jquery";
import html2canvas from "html2canvas";
import http from "./http";
import { getCookie, toggleDisplay, getQueryString, showEl, hideEl } from "./utils";
import setRem from "./setRem.js";
import "./css/reset.css";
import "./css/swiper-bundle.min.css";
import "./css/common.css";
import "./css/main.css";
import Swiper from "./swiper-bundle.min.js";

// import VConsole from "vconsole";
// new VConsole();
// console.info("vconsole-info-测试");

const QRCode = require('qrcode');
const areas = ["广州", "深圳", "珠海", "中山", "江门"]
const openid = getCookie("openid");
const act_name = "20211118_zslt";
// 能否抽奖
let canDraw = true;
// 核销的时候使用
let prizeId = ""
// 用户信息
let user = {};
// 倒计时
let countdown = 60;
// 助力openid
let share_openid = getQueryString("share_openid");
console.log("init share_openid", share_openid)
// 抽奖奖品
const prizes = [{
  name: "路由器100元代金券",
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
const shouldPrize = ["路由器100元代金券"];
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
// 标志login跳转
let loginToNext = "verify"
// 为了埋点配置的登记状态
let verifyStatus = "form"; // form success fail


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
        // 先判断是否是分享进来的
        user = res.data.data || { change: 1, prize_all_list: [], prize_list: [], help_list: [] }
        if (user?.nickname) {
          // $(".head-image").css("background-image", `url(${user?.headimgurl})`)
          $(".poster-name").text("@" + (user.nickname || "未知"))
        }
        console.log("getuser", share_openid, res.data.data);
        if (share_openid && share_openid != openid) {
          if (!res.data.data) showEl($(".index-login-wrap"))
          else {
            if (flag) {
              // 判断重复扫码，help_list share_openid
              // 漫画页（首页），并且弹出助力成功弹窗
              // const item = user?.help_list?.findIndex(item => item.openid === share_openid)
              // if (item != -1) {
              //   showEl($(".help-success-wrap"))
              // } else {
              // }
              showEl($(".index-help-wrap"))
            }
          }
        } else {
          share_openid = ""
          // a1. 第一次进入：漫画页（首页） 
          if (flag) {
            toggleDisplay($(".index"));
          }
        }
        // a2. 登录过(有tel)：漫画页去到【登记页】;
        // 判断登记失败还是成功
        if (user?.tel) {
          if (areas.includes(user?.tel_city) && user?.address) {
            verifyStatus = "success"
            $(".icon-phone").text("联系号码：" + user?.tel)
            $(".icon-addr").text("联系地址：" + user.address + user.address_more)
            if (user?.tvid) {
              $(".icon-network").text("宽带号码：" + user?.tvid)
              showEl($(".icon-network"))
            }
            if (user?.idcard) {
              $(".icon-idcard").text("身份证：" + user?.idcard)
              showEl($(".icon-idcard"))
            }
            showEl($(".checkin-success-result"))
            hideEl($(".checkin-result"))
          } else if (!areas.includes(user?.tel_city)) {
            verifyStatus = "fail"
            showEl($(".checkin-fail-result"))
            hideEl($(".checkin-result"))
          }
        }

        // 配置抽奖次数
        $(".draw-tips").text("当前抽奖次数：" + (user.chance))
        $(".draw-process").addClass(`progress${user?.prize_all_list?.length + 1}`)
        // 配置我的好友
        if (!user?.help_list?.length) {
          $(".friend-tips").text("当前未有呼叫成功的好友")
          hideEl($(".friends"))
        } else {
          $(".friend-tips").text(`当前共呼叫成功${user?.help_list?.length}个好友`)
          $(".friends").empty()
          user?.help_list.map(item => {
            $(".friends").append(`<div class="flx-col flx-all-center friends-item">
            <img src=${item.headimgurl} class="head">
            <div class="name row-2">${item.nickname}</div>
          </div>`)
          })
          showEl($(".friends"))
        }
        // 配置我的奖品展示
        if (user?.prize_list?.length) {
          $(".title-text").text(`我的号码：${user.tel}`)
          $(".prize1-content").remove();
          $(".prize1-tips").remove();
          $(".prize-verify").find(".prize2-content").remove();
          let count = 0
          user?.prize_list?.map(item => {
            if (shouldPrize.includes(item.prize)) {
              count += 1
              $(".has-prize").prepend(`
              <div class="bg prize1-content prize1-content-${count} flx-end">
                <div id=${item.prize_id} class="bg ${item.status == 0 ? 'prize-checkin-btn' : 'prize-checked-btn'}"></div>
                <div style="color: #e15852;position: absolute;top: .12rem;right: .5rem;font-size: .24rem;">ID: ${item.prize_id}</div>
              </div>`)
            }
            if (!["路由器100元代金券", "谢谢惠顾"].includes(item.prize) && prizeMap[item.prize]) {
              $(".prize-verify").append(`
              <div class="bg flx-all-center prize2-content">
                <div class="bg prize-item ${prizeMap[item.prize]}"></div>
                <div>${item.prize}</div>
                <div style="color: #e15852;position: absolute;right: .5rem;font-size: .24rem;">ID: ${item.prize_id}</div>
              </div>`)
            }
          })
          $(`.prize1-content-${count}`).after(`<div class="bg prize1-tips"></div>`)

          showEl($(".has-prize"))
          hideEl($(".none-prize"))
        } else {
          // 没有奖品
          $(".title-text").text(`我的号码：${user.tel}`)
          hideEl($(".has-prize"))
          showEl($(".none-prize"))
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
    .get(`/get_vcode?openid=${openid}&act_name=${act_name}&tel=${tel}`) //&type=test
    .then((res) => {
      if (res.data && res?.data?.code == 0) {
        // 正常逻辑不需要处理什么
        // const code = res.data.msg?.split("：")[1]
        // $("#vcode").val(code)
      } else {
        alert(res.data?.msg)
      }
    });
}

// 登陆
function login(tel, vcode) {
  console.log("login");
  http
    .get(`/tel_login?openid=${openid}&act_name=${act_name}&tel=${tel}&vcode=${vcode}`)
    .then((res) => {
      if (res.data && res.data.code == 0) {
        const area = res.data.data
        // 如果是助力流程
        console.log("share_openid", share_openid)
        getUserInfo(false)
        if (share_openid) {
          console.log("hrere")
          hideEl($(".index-login-wrap"))
          showEl($(".index-help-wrap"))
          return
        }
        // 判断一下是抽奖页还是登记页
        if (loginToNext === "prize") {
          getPrizing();
          makePrizes();
          toggleDisplay($(".prize-page"))
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
      } else {
        alert(res.data?.msg)
      }
    });
}

// 登记信息
function checkin(address, address_more, options) {
  console.log("checkin");
  let url = `/leave_userinfo?openid=${openid}&act_name=${act_name}&address=${address}&address_more=${address_more}`
  // 接口的校验顺序是先身份证后宽带号
  if (options.tvid) {
    url = url + `&tvid=${options.tvid}`
  }
  if (options.idcard) {
    url = url + `&idcard=${options.idcard}`
  }
  http
    .get(url)
    .then((res) => {
      if (res.data) {
        // 登记成功 -> 登记成功弹窗，修改登记页面显示(在userinfo接口也应判断显示)
        if (res.data.code == 0) {
          verifyStatus = "success"
          showEl($(".checkin-success"))
          $(".icon-phone").text("联系号码：" + user.tel)
          $(".icon-addr").text("联系地址：" + address + address_more)
          if (options.tvid) {
            $(".icon-network").text("宽带号码：" + options.tvid)
            showEl($(".icon-network"))
          }
          if (options.idcard) {
            $(".icon-idcard").text("身份证：" + options.idcard)
            showEl($(".icon-idcard"))
          }
          showEl($(".checkin-success-result"))
          hideEl($(".checkin-result"))
        } else if (res.data.code == 20012) {
          showEl($(".checkin-network-error"))
        } else if (res.data.code == 20011) {
          showEl($(".checkin-idcard-error"))
        } else {
          // 登记失败 -> 登记失败弹窗，修改登记页面显示(在userinfo接口也应判断显示)
          verifyStatus = "fail"
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
        const data = res.data?.data || []
        if (data?.length > 30) {
          data.length = 30
        }
        data?.map(item => {
          $(".prizing-swiper").children(".swiper-wrapper").append(`<div class="swiper-slide">恭喜${item.nickname}抽中${item.prize}</div>`)
        })
        runPrizing()
      }
    });
}


// 海报自定义埋点
function setPostLog() {
  console.log("setPostLog");
  http
    .get(`/set_poster_log?openid=${openid}`)
    .then((res) => {});
}

// 中奖信息滚动
function runPrizing() {
  new Swiper('.prizing-swiper', {
    loop: true,
    slidesPerView: "auto",
    spaceBetween: 30,
    autoplay: {
      delay: 800,
    },
    speed: 200,
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
    speed: 300,
    autoplay: {
      delay: 600,
    },
  })
}

// 抽奖
function drawPrize() {
  console.log("draw");
  if (canDraw) {
    canDraw = !canDraw
    http
      .get(`/draw?openid=${openid}`)
      .then((res) => {
        if (res.data) {
          canDraw = !canDraw
          // 抽奖次数不足
          if (res.data.code === 20003) {
            showEl($(".draw-fail"))
          } else if (res.data.code == 0) {
            // 抽奖成功，改变进度条，减少抽奖次数，直接调用user接口
            // "路由器100元代金券", 
            if (!["谢谢惠顾"].includes(res.data.data) && prizeMap[res.data.data]) {
              $(".draw-sussess-content").prepend(`
            <div class="prize-wrap flx-col flx-all-center">
              <div class="bg myprize ${prizeMap[res.data.data]}"></div>
              <div class="myprize-text">${res.data.data}</div>
            </div>
            `)
              showEl($(".draw-success"))
            } else if (res.data.msg == "C02") {
              // 谢谢惠顾
              showEl($(".draw-fail"))
            }
          } else if (res.data.msg == "C02") {
            // 谢谢惠顾
            showEl($(".draw-fail"))
          }
          getUserInfo(false)
        }
      });
  }
}

function drawToPic() {
  $("#poster-last").remove()
  showEl($("#poster"))
  // box -- 需要截取的屏幕的可视区域
  const height = document.getElementById("poster").clientHeight
  const width = document.getElementById("poster").clientWidth
  // const canvas = document.createElement('canvas')
  // canvas.width = width
  // canvas.height = height
  // const content = canvas.getContext('2d')
  // const rect = document.getElementById("poster").getBoundingClientRect()
  // content.translate(-rect.left, -rect.top)
  setTimeout(() => {
    html2canvas(document.getElementById("poster"), {
      allowTaint: true,
      taintTest: true,
      useCORS: true,
      // canvas: canvas,
      width: width,
      height: height,
      scrollY: 0,
      scrollX: 0
    }).then((c) => {
      // 微信浏览器下，可长按图片保存
      const elemImg = `<img id="poster-last" src="${c.toDataURL('image/png')}"" style='width: 100%'/>`
      $("#poster-img").append(elemImg)
      hideEl($("#poster"))
      showEl($("#poster-img"))
    }).catch(e => {
      console.log("html2canvas", e)
    })
  }, 10)
}

// 生成二维码
function sharePost() {
  QRCode.toCanvas(document.getElementById('canvas'),
    `http://h5.szhhhd.com/jx/a20211118_zslt?share_openid=${openid}`,
    function (error) {
      if (error) console.error(error)
      drawToPic()
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


// 核销
function verifyPrize(prizeid, tel) {
  http
    .get(`/hexiao?openid=${openid}&prizeid=${prizeid}&tel=${tel}`)
    .then((res) => {
      if (res.data.code == 0) {
        hideEl($(".verify-wrap"))
        hideEl($(".verify-fail-wrap"))
        showEl($(".verify-success-wrap"))
      } else {
        hideEl($(".verify-wrap"))
        hideEl($(".verify-success-wrap"))
        showEl($(".verify-fail-wrap"))
      }
    })
}

// 首页轮播
function getIndexSwiper() {
  http
    .get(`/draw_list`)
    .then((res) => {
      if (res.data) {
        const data = res.data?.data || []
        if (data?.length > 30) {
          data.length = 30
        }
        data?.map(item => {
          $(".index-prizing-swiper").children(".swiper-wrapper").append(`<div class="swiper-slide">恭喜${item.nickname}抽中${item.prize}</div>`)
        })
        new Swiper('.index-prizing-swiper', {
          loop: true,
          slidesPerView: "auto",
          spaceBetween: 30,
          autoplay: {
            delay: 800,
          },
          speed: 200,
        })
      }
    });
  prizes.map((item, index) => {
    $(".index-prize-swiper")
      .children(".swiper-wrapper")
      .append(`<div class="swiper-slide">
        <div class="bg ${index % 2 === 0 ? 'greed-wrap' : 'red-wrap'}">
          <div class="bg prize-item-wrap prize${index + 1}"></div>
        </div>
        <div class="prize-text row-2">${item.name}</div>
      </div>`)
  })
  new Swiper('.index-prize-swiper', {
    loop: true,
    slidesPerView: 3,
    speed: 300,
    autoplay: {
      delay: 600,
    },
  })
}

$(function () {
  setRem(750, 750, 320);
  getUserInfo();
  getIndexSwiper()
  // 首页点击
  $(".index-next").on("click", function () {
    if (user.tel) {
      toggleDisplay($(".checkin"));
      return
    }
    toggleDisplay($(".login"));
  });

  $(".index-prize").on("click", function () {
    if (!user.tel) {
      toggleDisplay($(".login"));
      loginToNext = "prize"
      return
    }
    getPrizing();
    makePrizes();
    toggleDisplay($(".prize-page"))
  });

  // 发送验证码
  $(".sendcode-btn").on("click", function () {
    const tel = $("#tel").val() || $("#index-tel").val();
    const id = $(this).attr("id");
    if (tel) {
      if (id == "page-vcode") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "page2_button1",
          "登录页-发送验证码",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      } else if (id == "popup-vcode") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "popup_button11",
          "弹窗-登录-验证码",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      }
      showEl($(".sendcode-btn-empty"))
      hideEl($(".sendcode-btn"))
      settime($(".sendcode-btn-empty"))
      getVcode(tel)
    }
  });

  // 登陆按钮
  $(".login-btn").on("click", function () {
    const tel = $("#tel").val() || $("#index-tel").val();
    const vcode = $("#vcode").val() || $("#index-vcode").val();
    const id = $(this).attr("id")
    console.log("id", id)
    if (tel && vcode) {
      if (id == "page-login") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "page2_button2",
          "登录页-登录按钮",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      } else if (id == "popup-login") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "popup_button12",
          "弹窗-登录-登录按钮",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      }


      login(tel, vcode)
    }
  });

  // 弹窗的关闭按钮
  $(".close-btn").on("click", function () {
    const id = $(this).attr("id")
    if (id == "checkin-login-fail") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button2",
        "弹窗-登录登记失败-关闭按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "checkin-login-success") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button4",
        "弹窗-登记成功-关闭按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "prize-success") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button6",
        "弹窗-中奖-关闭按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "prize-fail") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button14",
        "弹窗-奖品没有了-关闭按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "verify-success") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button8",
        "弹窗-核销成功-关闭按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "service-close") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button15",
        "弹窗-客服-关闭按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "prize-close") {
      if (user?.prize_list?.length) {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "popup_button18",
          "弹窗-我的奖品-关闭按钮",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      } else {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "popup_button16",
          "弹窗-我的奖品空白-关闭按钮",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      }

    }
    const popup = $(this).parent(".popup-wrap")
    hideEl(popup)
  });

  // 打开地址选择弹窗
  $("#address").on("click", function () {
    const baiduHtm = [
      "a20211118_zslt",
      "click",
      "page3_button1",
      "登记页-下拉框按钮",
    ];
    _hmt.push([
      "_trackEvent",
      baiduHtm[0],
      baiduHtm[1],
      baiduHtm[2],
      baiduHtm[3],
    ]);
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
    const tvid = $("#tvid").val();
    const idcard = $("#idcard").val();
    if (address && address_more && (tvid || idcard)) {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "page3_button5",
        "登记页-登记按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
      if (tvid || idcard) {
        checkin(address, address_more, { tvid, idcard })
      }
    } else {
      if (!address) {
        alert("请先填写地址")
      } else if (!address_more) {
        alert("请先填写详细地址")
      } else if (!(tvid || idcard)) {
        alert("请先填写身份证或者宽带号")
      }
    }
  });

  // 右侧抽奖按钮
  $(".icon-draw").on("click", function () {
    const id = $(this).attr("id")
    if (id === "verify-draw") {
      if (verifyStatus == "form") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "page3_button3",
          "登记页-抽奖按钮",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      } else if (verifyStatus == "success") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "page5_button2",
          "登记成功页-抽奖",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      } else if (verifyStatus == "fail") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "page6_button2",
          "登记失败页-抽奖",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      }
    }

    getPrizing();
    makePrizes();
    toggleDisplay($(".prize-page"))
  });

  // 抽奖
  $(".draw-btn").on("click", function () {
    const baiduHtm = [
      "a20211118_zslt",
      "click",
      "page4_button1",
      "抽奖页-立即抽奖",
    ];
    _hmt.push([
      "_trackEvent",
      baiduHtm[0],
      baiduHtm[1],
      baiduHtm[2],
      baiduHtm[3],
    ]);
    if (user?.chance == 0) {
      alert("没有抽奖次数了")
    } else {
      drawPrize()
    }
  });

  // 我的奖品页
  $(".draw-sussess-btn").on("click", function () {
    const baiduHtm = [
      "a20211118_zslt",
      "click",
      "popup_button5",
      "弹窗-中奖-查看奖品",
    ];
    _hmt.push([
      "_trackEvent",
      baiduHtm[0],
      baiduHtm[1],
      baiduHtm[2],
      baiduHtm[3],
    ]);
    // 重新获取一下用户的中奖信息
    getUserInfo(false)
    hideEl($(".draw-success"))
    showEl($(".my-prize-wrap"))
  });

  // 抽奖页都返回按钮 -> 登记页
  $(".back-btn").on("click", function () {
    const baiduHtm = [
      "a20211118_zslt",
      "click",
      "page4_button6",
      "抽奖页-返回按钮",
    ];
    _hmt.push([
      "_trackEvent",
      baiduHtm[0],
      baiduHtm[1],
      baiduHtm[2],
      baiduHtm[3],
    ]);
    toggleDisplay($(".checkin"))
  });

  // 海报页返回按钮 -> 抽奖页
  $(".poster-back-btn").on("click", function () {
    toggleDisplay($(".prize-page"))
  });

  // 登记失败弹窗按钮 -> 抽奖
  $(".checkin-fail-btn").on("click", function () {
    const baiduHtm = [
      "a20211118_zslt",
      "click",
      "popup_button1",
      "弹窗-登录登记失败-领红包",
    ];
    _hmt.push([
      "_trackEvent",
      baiduHtm[0],
      baiduHtm[1],
      baiduHtm[2],
      baiduHtm[3],
    ]);
    getPrizing();
    makePrizes();
    toggleDisplay($(".prize-page"))
  });

  // 生成链接
  $(".link-btn").on("click", function () {
    const baiduHtm = [
      "a20211118_zslt",
      "click",
      "page4_button4",
      "抽奖页-生成链接",
    ];
    _hmt.push([
      "_trackEvent",
      baiduHtm[0],
      baiduHtm[1],
      baiduHtm[2],
      baiduHtm[3],
    ]);
    showEl($(".link-wrap"))
  });

  // 生成海报
  $(".poster-btn").on("click", function () {
    const baiduHtm = [
      "a20211118_zslt",
      "click",
      "page4_button5",
      "抽奖页-生成海报",
    ];
    _hmt.push([
      "_trackEvent",
      baiduHtm[0],
      baiduHtm[1],
      baiduHtm[2],
      baiduHtm[3],
    ]);
    setPostLog()
    sharePost()
  });

  // 我的奖品按钮
  $(".prize-btn ").on("click", function () {
    const baiduHtm = [
      "a20211118_zslt",
      "click",
      "page4_button3",
      "抽奖页-我的奖品",
    ];
    _hmt.push([
      "_trackEvent",
      baiduHtm[0],
      baiduHtm[1],
      baiduHtm[2],
      baiduHtm[3],
    ]);
    // 重新获取一下用户的中奖信息
    getUserInfo(false)
    showEl($(".my-prize-wrap"))
  });

  // 助力弹窗返回首页
  $(".back-close-btn").on("click", function () {
    const id = $(this).attr("id")
    if (id == "help-success") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button20",
        "弹窗-助力成功-关闭按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "help-fail") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button22",
        "弹窗-助力失败-关闭按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "login-close") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button13",
        "弹窗-登录-关闭按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    }
    toggleDisplay($(".index"))
  });

  // 确认助力
  $(".help-btn").on("click", function () {
    const baiduHtm = [
      "a20211118_zslt",
      "click",
      "page7_button1",
      "助力页-我要帮他",
    ];
    _hmt.push([
      "_trackEvent",
      baiduHtm[0],
      baiduHtm[1],
      baiduHtm[2],
      baiduHtm[3],
    ]);
    helpFriend()
  });

  // 我要拿红包按钮
  $(".help-index-btn").on("click", function () {
    const id = $(this).attr("id")
    if (id == "help-success-btn") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button19",
        "弹窗-助力成功-我要拿红包",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "help-fail-btn") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button21",
        "弹窗-助力失败-我要拿红包",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    }
    toggleDisplay($(".index"))
  });

  // 打开规则也
  $(".rule").on("click", function () {
    const id = $(this).attr("id");
    if (id == "login-rule") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "page2_button3",
        "登录页-规则按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "checkin-rule") {
      if (verifyStatus == "form") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "page3_button4",
          "登记页-规则按钮",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      } else if (verifyStatus == "success") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "page5_button3",
          "登记成功页-规则",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      } else if (verifyStatus == "fail") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "page6_button3",
          "登记失败页-规则",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      }

    } else if (id == "prize-rule") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "page4_button7",
        "抽奖页-规则按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "verify-popup") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button10",
        "弹窗-核销-关闭按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    }
    showEl($(".rule-wrap"))
  });

  // 关闭规则也
  $(".rule-back-btn").on("click", function () {
    hideEl($(".rule-wrap"))
  });

  // 打开客服弹窗
  $(".icon-service").on("click", function () {
    const id = $(this).attr("id");
    if (id == "checkin-service") {
      if (verifyStatus == "form") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "page3_button2",
          "登记页-客服按钮",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      } else if (verifyStatus == "success") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "page5_button1",
          "登记成功页-客服",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      } else if (verifyStatus == "fail") {
        const baiduHtm = [
          "a20211118_zslt",
          "click",
          "page6_button1",
          "登记失败页-客服",
        ];
        _hmt.push([
          "_trackEvent",
          baiduHtm[0],
          baiduHtm[1],
          baiduHtm[2],
          baiduHtm[3],
        ]);
      }

    } else if (id == "prize-service") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "page4_button2",
        "抽奖页-客服",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    } else if (id == "help-service") {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "page7_button1",
        "助力页-抽奖按钮",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
    }

    showEl($(".service-wrap"))
  });

  // 去抽奖
  $(".checkin-sussess-btn").on("click", function () {
    const baiduHtm = [
      "a20211118_zslt",
      "click",
      "popup_button3",
      "弹窗-登记成功-去抽奖",
    ];
    _hmt.push([
      "_trackEvent",
      baiduHtm[0],
      baiduHtm[1],
      baiduHtm[2],
      baiduHtm[3],
    ]);
    getPrizing();
    makePrizes();
    toggleDisplay($(".prize-page"))
  });

  // 核销
  $(".has-prize").on("click", ".prize-checkin-btn", function (ev) {
    prizeId = $(this).attr("id");
    // 获取元素id(选择的值)
    console.log("answer", prizeId);
    const baiduHtm = [
      "a20211118_zslt",
      "click",
      "popup_button17",
      "弹窗-我的奖品-去核销按钮",
    ];
    _hmt.push([
      "_trackEvent",
      baiduHtm[0],
      baiduHtm[1],
      baiduHtm[2],
      baiduHtm[3],
    ]);
    showEl($(".verify-wrap"))
    hideEl($(".my-prize-wrap"))
  });

  //  确认核销
  $(".verify-btn").on("click", function () {
    const verifycode = $("#averify").val()
    if (verifycode && prizeId) {
      const baiduHtm = [
        "a20211118_zslt",
        "click",
        "popup_button9",
        "弹窗-核销-确认核销",
      ];
      _hmt.push([
        "_trackEvent",
        baiduHtm[0],
        baiduHtm[1],
        baiduHtm[2],
        baiduHtm[3],
      ]);
      verifyPrize(prizeId, verifycode)
    }
  });
});
