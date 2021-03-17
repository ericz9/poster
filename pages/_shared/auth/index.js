import util from '../../../utils/util.js'
const app = getApp()

Page({
  data: {
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    logoUrl: '', //LOGO地址
  },
  onLoad() {
    if (app.globalData.whoami) {
      this.setData({
        logoUrl: util.env().fileServerUrl + app.globalData.whoami.config.logoUrl
      })
    } else {
      app.launchCallback = () => {
        this.setData({
          logoUrl: util.env().fileServerUrl + app.globalData.whoami.config.logoUrl
        })
      }
    }
  },
  bindGetUserInfo(e) {
    if (e.detail.userInfo) {
      util.login(true)
      .then(() => {
        wx.navigateBack()
      })
    } else {
      wx.showModal({
        title: '提示',
        content: '需要通过授权才能继续，请重新点击并授权。',
        showCancel: false
      })
    }
  }
})