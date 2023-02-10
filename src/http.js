import axios from "axios";
import jquery from "jquery";

axios.defaults.timeout = 100000;

axios.defaults.paramsSerializer = function (params) {
  if (typeof params == "object") {
    var paramsCopy = JSON.parse(JSON.stringify(params));
    for (var k in paramsCopy) {
      if (typeof paramsCopy[k] == "object") {
        paramsCopy[k] = JSON.stringify(paramsCopy[k]);
      }
    }
  }
  return jquery.param(paramsCopy);
};
// 请求拦截器
axios.defaults.onReqSuccess = function (config) {
  return config;
};
axios.defaults.onReqError = function (error) {
  return Promise.reject(error);
};
// 返回拦截器
axios.defaults.onResSuccess = function (res) {
  return res.data;
};
axios.defaults.onResError = function (error) {
  // 401 ...等处理
  return Promise.reject(error);
};

// export default axios
let http = axios.create({
  baseURL: "http://h5.intech.szhhhd.com/out/A20230215_mh",
  paramsSerializer: axios.defaults.paramsSerializer,
});
http.interceptors.request.use(
  axios.defaults.onReqSuccess,
  axios.defaults.onReqError
);
http.interceptors.response.use(
  axios.defaults.onReqSuccess,
  axios.defaults.onReqError
);

export default http;

