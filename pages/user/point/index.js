import api from '../../../utils/api.js'
import util from '../../../utils/util.js'
const app = getApp()

Component({
  data: {
    //数据初始化加载状态
    //loading 加载中
    //success 成功
    //apiFailed API接口请求失败，可重试
    loading: 'loading',
    loadingRetry: false, //加载失败后，尝试重试获取数据时为TRUE
    user: {}, //用户信息
    pointSettings: [], //积分规则
    hasSignin: '0', //今天是否已签到
    signinPoint: 0, //签到所获得积分
    showSigninSuccessDialog: false, //是否显示签到成功弹出层
  },
  methods: {
    onLoad() {
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
      return new Promise((resolve, reject) => {
        let failed = { loading: '' }
        let user, pointSettings, hasSignin, signinPoint

        //获取用户信息
        api.getUser()
        .then((d) => {
          user = d

          //查询积分规则
          return api.queryPointSetting()
        }, () => {
          failed.loading = failed.loading || 'apiFailed'
          return Promise.reject()
        })
        .then((d) => {
          pointSettings = []
          d.forEach((item) => {
            if (item.rules.length > 0) {
              item.index = item.code === 'signin_incr' ? 1 : item.code === 'recommend_incr' ? 2 : 3
              pointSettings.push(item)
            }
          })

          //排序
          pointSettings.sort(function(a, b) {
            return a.index - b.index
          })
          
          //签到积分规则
          const signinSetting = pointSettings.filter(k => k.code === 'signin_incr')[0]
          signinPoint = signinSetting.rules[0].point

          //验证用户今天是否已签到
          return api.verifyUserHasSignin({
            settingId: signinSetting.id
          })
        }, () => {
          failed.loading = failed.loading || 'apiFailed'
          return Promise.reject()
        })
        .then((d) => {
          hasSignin = d.value

          this.setData({
            loading: 'success',
            loadingRetry: false,
            user: user,
            pointSettings: pointSettings,
            hasSignin: hasSignin,
            signinPoint: signinPoint
          })

          resolve()
        }, () => {
          failed.loading = failed.loading || 'apiFailed'
          return Promise.reject()
        })
        .catch((err) => {
          this.setData(failed)
          reject(err)
        })
      })
    },
    //初始化失败时重新加载
    reInitialize() {
      this.setData({
        loadingRetry: true
      })
      this.initialize().catch(() => {
        //重新加载时再次失败，重置标识
        this.setData({
          loadingRetry: false
        })
      })
    },
    //积分明细
    onClickPointLog() {
      wx.navigateTo({url: '/pages/user/point-log/index'})
    },
    //签到
    onClickSignin() {
      api.addPointLog({
        code: 'signin_incr'
      }, {
        loading: true,
        showToast: true
      })
      .then(() => {
        this.setData({
          showSigninSuccessDialog: true
        })
      })
    },
    //关闭签到成功弹出层
    onCloseSigninSuccessDialog() {
      api.getUser()
      .then((d) => {
        this.setData({
          showSigninSuccessDialog: false,
          hasSignin: '1',
          user: d
        })
      })
    },
    //下拉刷新
    onPullDownRefresh() {
      this.initialize()
      .then(() => {
        wx.stopPullDownRefresh()
      })
      .catch(() => {
        wx.stopPullDownRefresh()
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
