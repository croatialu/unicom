import $ from "jquery";
import http from "./http";
import { getCookie, toggleDisplay, getQueryString, showEl, hideEl } from "./utils";
import setRem from "./setRem.js";
import "./css/reset.css";
import "./css/swiper-bundle.min.css";
import "./css/common.css";
import "./css/main.css";

const act_name = "0215_mh";
const last_login_time = localStorage.getItem("last")
const last_date = last_login_time ? last_login_time.split(" ")[0].split("-")[2] : 0
const date = new Date().getDate()
// 能否抽奖
let get_prize_times = 0;
let look_ad_times = 0;
// 用户信息
let user = {};
let tel = last_date >= date ? localStorage.getItem("tel") : "";
let countdown = 60
let adCount = 15

function getUserInfo() {
  if (!tel) return
  return http
    .get(`/get_userinfo?tel=${tel}&act_name=${act_name}`)
    .then((res) => {
      if (res.data) {
        user = res.data.data;
        look_ad_times = user.look_ad_times;
        get_prize_times = user.get_prize_times;
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

function adTimer(val) {
  var int = setTimeout(function () {
    adTimer(val)
  }, 1000)
  if (adCount == 0) {
    showEl($(".time-close-btn"))
    hideEl($(".time"))
    clearInterval(int);
    adCount = 15;
  } else {
    $(".time").text(`倒计时${adCount}秒`)
    adCount--;
  }
}

// 验证码--test mode
function getVcode(tel) {
  console.log("getVcode");
  http
    .get(`/get_vcode?&act_name=${act_name}&tel=${tel}&type=test`) //&type=test
    .then((res) => {
      if (res.data && res?.data?.code == 0) {
        // 正常逻辑不需要处理什么
        const code = res.data.msg
        $("#vcode").val(code)
      } else {
        alert(res.data?.msg)
      }
    });
}

// 登陆
function login(u_tel, vcode) {
  console.log("login");
  http
    .get(`/tel_login?act_name=${act_name}&tel=${u_tel}&vcode=${vcode}`)
    .then((res) => {
      if (res.data && res.data.code == 0) {
        toggleDisplay($(".manghe"));
        tel = u_tel
        localStorage.setItem("tel", tel)
        localStorage.setItem("last", res.data.data?.last_login_time)
      } else {
        alert(res.data?.msg)
      }
    });
}

// 抽奖
function drawPrize() {
  console.log("darpriz", get_prize_times, look_ad_times)
    if (get_prize_times) {
      http
        .get(`/get_prize?act_name=${act_name}&tel=${tel}&t_d=2023-02-15`) // t_d
        .then((res) => {
          if (res.data) {
            canDraw = !canDraw
            // 当天抽奖次数已达上限
            if (res.data.code === 10020) {
              showEl($(".draw-fail"))
            } else if (res.data.code == 0) {
              // 抽奖成功，减少抽奖次数，直接调用user接口
              // 1号 - 15GB畅视融合包
              // 2号 - 10GB定向流量大礼包
              // 3号 - 5GB通用流量包+联通云盘100GB乐享会员
              // 4号 - 25GB快手定向流量包
              // 5号 - 兔墩墩毛绒钥匙扣一个
              // 6号 - 兔墩墩吉祥如意徽章一个
              // 7号 - 兔墩墩盲盒一个
              console.log(res.data.prize_id)
              const prizeId = res.data.prize_id;
              $(".award").addClass("hide")
              $(".prize-wrap").removeClass("hide")
              $(`.prize${prizeId}`).removeClass("hide")
              
            } else {
              // alert(res.data?.msg || "您无抽奖资格")
            }
            getUserInfo()
            //test
            // const prizeId = 4;
            // $(".award").addClass("hide")
            // $(".prize-wrap").removeClass("hide")
            // $(`.prize${prizeId}`).removeClass("hide")
          }
        });
    } else if(look_ad_times == 0){
      // 放广告
      adTimer()
      
      showEl($(".ad"))
      // "look_ad_times":0,	//今天观看的广告次数
      // "get_prize_times":0,	//今天抽奖次数
    } else {
      // 抽奖次数已用完
      showEl($(".draw-fail"))
      hideEl($(".award"))
    }
}

// 登记信息
function checkin(address, true_tel, username) {
  console.log("checkin");
  if(address && true_tel && username) {
    let url = `/leave_userinfo?act_name=${act_name}&address=${address}&tel=${tel}&username=${username}&true_tel=${true_tel}`
  http
    .get(url)
    .then((res) => {
      if (res.data.code == 0) {
        alert("登记成功")
        $(".info").addClass("hide")
      } else {
        alert(res.data?.msg || "登记失败")
      }
    });
  } else {
    alert("请填写完整收货信息")
  }
}

//set_ad_info
function set_ad_info() {
  console.log("set_ad_info");
  let url = `/set_ad_info?act_name=${act_name}&tel=${tel}`
  http
    .get(url)
    .then((res) => {
      getUserInfo()
    });
}



$(function () {
  setRem(750, 750, 325);
  getUserInfo();

  // 打开登陆弹窗
  $(".a-login").on("click", function () {
    console.log("login", tel)
    if (!tel) {
      showEl($(".login"));
    } else {
      toggleDisplay($(".manghe"))
    }
  });

  //点击登录
  $(".login-btn").on("click", function () {
    const tel = $("#tel").val() || $("#index-tel").val();
    const vcode = $("#vcode").val() || $("#index-vcode").val();
    console.log("login,", tel, vcode)
    if (tel && vcode) {
      login(tel, vcode);
    }
  });

  // 发送验证码
  $(".sendcode-btn").on("click", function () {
    const tel = $("#tel").val() || $("#index-tel").val();
    if (tel) {
      showEl($(".sendcode-btn-empty"))
      hideEl($(".sendcode-btn"))
      settime($(".sendcode-btn-empty"))
      getVcode(tel)
    }
  });

  // 点击奖品
  $(".item").on("click", function () {
    const index = $(this).attr("data-index")
    console.log("index", index)
    $(`.award${index}`).removeClass("hide")
  })

  // 弹窗的关闭按钮
  $(".close-btn").on("click", function () {
    const popup = $(this).parent(".popup-wrap")
    hideEl(popup)
  });

  $(".prize-close-btn").on("click", function () {
    const popup = $(this).parent(".prize").parent(".prize-wrap")
    hideEl(popup)
  });

  // 选择
  $(".choose-btn").on("click", function () {
    const popup = $(this).parent(".popup-wrap")
    const index = popup.attr("data-index");
    // 设置popup背景图
    popup.addClass(`award${index}_2`)
    // 调抽奖接口
    drawPrize()
    // setTimeout(() => {
    //   hideEl(popup)
    // }, 1000)
  });

  /** 点击跳转到外部链接 */
  $(".buy-btn").on("click", function () {
    const id = $(this).attr("data-id")
    const map = {
      1: "https://wo.zj186.com/v/6jiaqm", // 15G
      2: "https://wo.zj186.com/v/eaUJ7b", // 多视频
      3: "https://wo.zj186.com/v/JRjQni", // 5G
      4: "https://wo.zj186.com/v/qyENbe", // 25G
    }
    if (map[id]) {
      window.location.href = map[id];
    }
  })

  /** 点击留资 */
  $(".buy-2-btn").on("click", function () {
    // const id = $(this).attr("data-id")
    // 打开留资弹窗
    $(".info").removeClass("hide")
  })

  $(".info-btn").on("click", function () {
    const name = $("#info-name").val();
    const tel = $("#info-tel").val();
    const addr = $("#info-addr").val();
    checkin(addr, tel, name)
  })

  $(".draw-fail-btn").on("click", function() {
    hideEl($(".draw-fail"))
  })

  // -------------------------
  // 关闭
  $(".time-close-btn").on("click", function() {
    hideEl($(".ad"))
    // 
    set_ad_info()
  })

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
