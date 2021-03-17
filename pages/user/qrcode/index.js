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
    qrcodes: [], //二维码
    //图片裁剪
    imageCrop: {
      visible: false,
      url: '', //裁剪图片地址,
      //裁剪尺寸
      size: { width: 300, height: 300 },
      cropSizePercent: 1, //裁剪框显示比例
      borderColor: '#fff', //裁剪框边框颜色
    }
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

        //获取所有的常用二维码
        this.getUserQrcodes()
        .then((d) => {
          this.setData({
            loading: 'success',
            loadingRetry: false,
            qrcodes: d
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
    //获取所有的常用二维码
    getUserQrcodes() {
      return new Promise((resolve, reject) => {
        api.getUserQrcodes()
        .then((d) => {
          //填充图片尺寸
          d.forEach((item) => {
            item.imageUrl = util.imageResizer(item.imageUrl, '300', '300', 'c')
          })

          resolve(d)
        })
        .catch(() => {
          reject()
        })
      })
    },
    //上传图片
    onClickUploadImage() {
      //最大上传数量
      if (this.data.qrcodes.length >= app.globalData.whoami.config.userMaxUploadQrcode) {
        wx.showModal({
          title: '提示',
          content: `最多可上传${app.globalData.whoami.config.userMaxUploadQrcode}张二维码哦`,
          showCancel: false
        })
      } else {
        let self = this
        wx.chooseImage({
          count: 1,
          sizeType: ['original', 'compressed'],
          sourceType: ['album', 'camera'],
          success (res) {
            self.setData({
              'imageCrop.visible': true,
              'imageCrop.url': res.tempFilePaths[0]
            })
          }
        })
      }
    },
    //关闭裁剪
    onCloseCropCallback() {
      this.setData({
        'imageCrop.visible': false
      })
    },
    //图片裁剪完成
    onCropCallback(evt) {
      let self = this
      wx.showLoading({
        title: '努力上传中',
        mask: true
      })

      wx.uploadFile({
        url: `${util.env().fileServerUrl}/api/upload/index`,
        filePath: evt.detail.resultSrc,
        name: 'file',
        formData: {
          'apiKey': app.globalData.whoami.config.fileServerApiKey,
          'category': 'poster_user',
          'secCheck': 1,
          'industryCode': app.globalData.industryCode
        },
        success(res) {
          const file = JSON.parse(res.data)
          if (file.errcode === 0) {
            api.opUserQrcode({
              opType: 1,
              imageUrl: file.data.url,
              isDefault: 0
            })
            .then(() => {
              return self.getUserQrcodes()
            })
            .then((d) => {
              self.setData({
                'imageCrop.visible': false,
                qrcodes: d
              })
              
              wx.hideLoading()
            })
            .catch(() => {
              wx.hideLoading()
            })
          } else {
            wx.hideLoading()
            wx.showToast({
              title: file.errmsg,
              icon: 'none'
            })
          }
        },
        fail() {
          wx.hideLoading()
        }
      })
    },
    //设为默认二维码
    onClickSetDefault(evt) {
      api.opUserQrcode({
        opType: 2,
        id: evt.currentTarget.id
      })
      .then(() => {
        return this.getUserQrcodes()
      })
      .then((d) => {
        wx.showToast({
          title: '设置成功'
        })

        this.setData({
          qrcodes: d
        })
      })
    },
    //删除二维码
    onClickDelete(evt) {
      let self = this
      wx.showModal({
        title: '提示',
        content: '确认要删除这个二维码吗？',
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({
              title: '正在删除中',
              mask: true
            })

            api.opUserQrcode({
              opType: 3,
              ids: [evt.currentTarget.id]
            })
            .then(() => {
              return self.getUserQrcodes()
            })
            .then((d) => {
              self.setData({
                qrcodes: d
              })

              wx.hideLoading()
            })
            .catch(() => {
              wx.hideLoading()
            })
          }
        }
      })
    }
  }
})
