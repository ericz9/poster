import util from '../../../utils/util.js'
import store from '../../../utils/store.js'
const app = getApp()

Component({
  params: {}, //查询参数
  
  data: {
    isShare: false, //是否是从用户分享进入
    saveImage: false, //图片是否保存到手机相册
    imageUrl: '', //海报图片URL地址
  },
  methods: {
    onLoad(params) {
      this.params = params
      store.setRecommendUserId((params || {}).recommendUserId)

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
      this.setData({
        isShare: this.params.share == 1,
        saveImage: this.params.saveImage == 1,
        imageUrl: util.imageResizer(this.params.imageUrl, '375', '750', 'm')
      })
      
      if (this.data.saveImage) {
        wx.showToast({
          title: '已保存到系统相册'
        })
      }
    },
    //预览图片
    previewImage() {
      const imageUrl = util.imageClear(this.params.imageUrl)
      wx.previewImage({
        current: imageUrl,
        urls: [imageUrl]
      })
    },
    //去首页
    onClickGotoHome() {
      wx.switchTab({ url: '/pages/home/index' })
    },
    //使用此设计
    onClickGotoDesign() {
      util.login()
      .then(() => {
        wx.navigateTo({url: `/pages/poster/design/index?workId=${this.params.id}`})
      })
    },
    //监听分享事件
    onShareAppMessage(res) {
      return {
        title: app.globalData.whoami.config.shareTitle,
        path: `/pages/poster/design-finish/index?id=${this.params.id}&imageUrl=${this.params.imageUrl}&share=1&recommendUserId=${app.globalData.whoami.user.id}`,
        imageUrl: this.data.imageUrl
      }
    }
  }
})
