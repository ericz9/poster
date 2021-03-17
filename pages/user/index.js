import util from '../../utils/util.js'
const app = getApp()

Component({
  data: {
    user: {}, //用户信息
    showContactCustomDialog: false, //是否显示联系客服的弹出层
  },
  methods: {
    onShow() {
      if (app.globalData.whoami) {
        this.initialize()
      } else {
        app.launchCallback = () => {
          this.initialize()
        }
      }
    },
    //初始化
    initialize() {
      //显示导航条加载动画
      wx.showNavigationBarLoading()

      let user = {
        login: 0,
        nickName: '',
        headImg: `${util.env().fileServerUrl}/images/public/assets/avatar.png`
      }

      if (app.globalData.whoami.login === 1) {
        user.login = 1
        user.nickName = app.globalData.whoami.user.nickName
        user.headImg = app.globalData.whoami.user.headImg
      }

      this.setData({
        user: user
      })
      wx.hideNavigationBarLoading()
    },
    //登录
    onClickLogin() {
      util.login()
      .then(() => {
        this.initialize()
      })
    },
    //联系客服
    onClickContactCustom() {
      this.setData({
        showContactCustomDialog: true
      })
    },
    //关闭“联系客服”弹出层
    onCloseContactCustomDialog() {
      this.setData({
        showContactCustomDialog: false
      })
    },
    //复制微信号
    onClickClipboardWx() {
      let self = this
      wx.setClipboardData({
        data: app.globalData.whoami.config.customWxAccount,
        success() {
          self.onCloseContactCustomDialog()
        }
      })
    },
    //监听分享事件
    onShareAppMessage(res) {
      return {
        title: app.globalData.whoami.config.shareTitle,
        path: `/pages/home/index?recommendUserId=${app.globalData.whoami.user.id}`,
        imageUrl: util.env().fileServerUrl + app.globalData.whoami.config.shareImage
      }
    }
  }
})
