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
  selector
    .removeClass("hide")
    .addClass("show")
    .siblings()
    .removeClass("show")
    .addClass("hide");
}


// 发送答案
function sendAnswer() {
  const data = {};
  answer
    .filter((a) => a && a.length)
    .forEach((item, index) => {
      data[`answer[${index}]`] = item.sort().join("");
    });
  console.log("answer", data);
  http
    .post("/set_answer", qs.stringify({ openid, ...data }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    .then((res) => {
      console.log("answer", res);
      if (res.data?.data === "谢谢参与" || !res.data?.data) {
        // 没抽中
        showPrize(false);
        // $(".prize-text").text(res.data.data);
        // $(".prize-null").removeClass("show").addClass("hide");
      } else {
        prizeText = res.data.data;
        showPrize(true, res.data.data);
        // $(".prize-image").removeClass("show").addClass("hide");
        // $(".prize-null").removeClass("hide").addClass("show");
      }
    });
}

// 留资
function sendInfo(true_name, true_tel, tv_user) {
  http
    .get(
      `/leave_userinfo?openid=${openid}&act_name=${act_name}&true_tel=${true_tel}&true_name=${true_name}&tv_user=${tv_user}`
    )
    .then((res) => {
      if (res.data) {
        // 这里控制我的奖品的显示
        tvUser = tv_user;
        if (prizeText) {
          showPrize(true, prizeText, tv_user);
        }
        if (prizeText === "5元观影代金券") {
          $(".popup").addClass("popup_5");
        } else if (prizeText === "10元观影代金券") {
          $(".popup").addClass("popup_10");
        } else if (prizeText === "20元观影代金券") {
          $(".popup").addClass("popup_20");
        }
        $(".popup").removeClass("hide").addClass("show");
        $("#back").removeClass("show").addClass("hide");
      }
    });
}


// 渲染题目内容接口
const renderQNode = (qNumber) => {
  if (qNumber > 10) return;
  // 第一题
  const $awrap = $("#awrap");
  // 先清空所有内容
  $awrap.empty();
  // 题目
  $awrap.append(`<div class="q q${qNumber}"></div>`);
  // 答题内容
  const currentQuestion = Questions[qNumber];
  // line
  if ([4, 5, 6].includes(qNumber)) {
    $awrap.append(`<div class="line line-micro">
    <div class="content bottom_radius" id="qc${qNumber}"></div>
  </div>`);
    const $question = $("#qc" + qNumber);
    for (let i = 0; i < currentQuestion.length; i++) {
      $question.append(`
  <div class="select-item" id=${i}>
    <span class="select"></span>
    <span class="select-text">${currentQuestion[i]}</span>
  </div>`);
    }
  } else if ([2, 3].includes(qNumber)) {
    const text =
      qNumber === 2
        ? "（请用0-10分来评价，10分非常满意，0分完全不满意。）"
        : "（请用0-10分来评价，10分非常推荐，0分完全不推荐。）";
    $awrap.append(`<div class="line line-micro">
    <div class="content content-couple bottom_radius" id="qc${qNumber}"><p class="couple-tip">${text}</p></div>
  </div>`);
    const $question = $("#qc" + qNumber);
    for (let i = 0; i < currentQuestion.length; i++) {
      $question.append(`
  <div class="select-item select-item-couple" id=${i}>
    <span class="select"></span>
    <span class="select-text">${currentQuestion[i]}</span>
  </div>`);
    }
  } else {
    $awrap.append(`<div class="line">
    <div class="content bottom_radius" id="qc${qNumber}"></div>
  </div>`);
    const $question = $("#qc" + qNumber);
    for (let i = 0; i < currentQuestion.length; i++) {
      $question.append(`
    <div class="select-item" id=${i}>
      <span class="select"></span>
      <span class="select-text">${currentQuestion[i]}</span>
    </div>`);
    }
  }

  // 点击选择
  $(".content").on("click", ".select-item", function (ev) {
    const item = $(this).children(".select");
    const value = $(this).attr("id");
    if (item.hasClass("selected")) {
      item.removeClass("selected");
      const currentAnswer = answer[globalData.no];
      const selectAnswerMapValue = answerMap[value];
      const rightAnswer = currentAnswer.filter((value) => {
        return value !== selectAnswerMapValue;
      });
      answer[globalData.no] = rightAnswer;
      if (rightAnswer.length === 0) {
        globalData.isNext = false;
      }
    } else {
      item.addClass("selected");
      let currentAnswer = answer[globalData.no] || [];
      const selectAnswerMapValue = answerMap[value];
      console.log("currentAnswer", currentAnswer);
      // 对单选做限制：2,3,7
      if ([2, 3, 7, 9].includes(globalData.no)) {
        $(this).siblings().children(".select").removeClass("selected");
        currentAnswer = [selectAnswerMapValue];
      } else {
        currentAnswer.push(selectAnswerMapValue);
      }
      answer[globalData.no] = currentAnswer;
      globalData.isNext = true;
    }
    // 获取元素id(选择的值)
    console.log("answer", value, answer);
  });
};

/** 用户信息请求 **/
function getUserInfo() {
  console.log("getuser");
  http
    .get(`/get_user_info?openid=${openid}&act_name=${act_name}`)
    .then((res) => {
      if (res.data) {
        console.log("getuser", res);
        // 有三种情况：1.第一次进来；2.已答题没留资；3.已答题已留资
        // has_answer 是否已答题， true_tel 留资
        // 1.第一次进来,data为null
        if (!res.data.data) {
          // 处理奖品显示
          showPrize(false);
          toggleDisplay($indexPage);
        } else {
          const { has_answer, true_tel, tv_user, answer_prize } =
            res.data.data || {};
          tvUser = tv_user;
          prizeText = answer_prize;
          // 2.已答题没留资；
          if (has_answer && !true_tel) {
            toggleDisplay($infoPage);
          } else if (has_answer && true_tel) {
            // 3.已答题已留资, 就去我的奖品页
            // 去奖品页之前判断一下有没有中奖，有的话需要更换中奖背景图
            if (answer_prize) {
              showPrize(true, answer_prize, tv_user);
            } else {
              showPrize(false);
            }
            toggleDisplay($prizePage);
            $("#back").removeClass("show").addClass("hide");
          } else {
            // 其他情况都去主页
            toggleDisplay($indexPage);
          }
        }
      } else {
        // 请求失败显示主页
        toggleDisplay($indexPage);
      }
    });
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