import api from 'utils/api.js'

App({
  onLaunch: function (options) {
    //全局配置API请求
    api.http.baseURL = this.globalData.debug ? this.globalData.env.devp.apiUrl : this.globalData.env.prod.apiUrl

    //从本地存储中获取sessionId
    const sessionId = wx.getStorageSync('sessionId')
    if (sessionId) {
      api.http.token = sessionId
    }

    //系统配置信息
    let whoami = {}
    api.whoami({
      industryCode: this.globalData.industryCode
    })
    .then((d) => {
      api.http.token = d.sessionId
      wx.setStorageSync('sessionId', d.sessionId)
      whoami = d

      //授权登录
      return api.wxLogin()
    })
    .then((d) => {
      whoami.login = 1
      whoami.user = d
      this.globalData.whoami = whoami

      // 由于 api.whoami 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      this.launchCallback && this.launchCallback()
    })
    .catch(() => {
      whoami.login = 0
      whoami.user = {}
      this.globalData.whoami = whoami

      // 由于 api.whoami 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      this.launchCallback && this.launchCallback()
    })
  },
  globalData: {
    debug: false,
    //环境配置
    env: {
      //开发环境
      devp: {
        apiUrl: 'http://poster.mline.vip/api/customer', //接口地址
        fileServerUrl: 'http://oss.mline.vip', //文件服务地址
      },
      //生产环境
      prod: {
        apiUrl: 'https://vb.duomai88.com/api/customer', //接口地址
        fileServerUrl: 'https://file.duomai88.com', //文件服务地址
      }
    },
    industryCode: 'POI', //当前行业代码
    whoami: null, //系统配置信息
  }
})